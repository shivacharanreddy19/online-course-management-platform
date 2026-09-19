"""
Payment architecture.

PAYMENT_MODE=mock  →  payments always "succeed" instantly (development).
To integrate Razorpay later:
  1. `pip install razorpay`, add keys to backend/.env
  2. Implement create_order() / verify_signature() here
  3. Flip PAYMENT_MODE=razorpay
Nothing else in the codebase needs to change — checkout always calls
process_payment() and only finalises the order when it succeeds.

⚠ NEVER store card numbers, CVV or UPI PIN. The frontend's mock form does
not transmit any card data to the server.
"""
import uuid
from services.supabase_service import sb, notify
from utils.helpers import first_row


def process_payment(amount: float, method: str = "mock_card") -> dict:
    """Charge `amount`. Returns {'status': 'paid'|'failed', 'transaction_id': ...}."""
    return {
        "status": "paid",
        "transaction_id": "MOCK-" + uuid.uuid4().hex[:12].upper(),
    }


def checkout(student: dict, payment_method: str = "mock_card") -> dict:
    """Convert the student's cart into a paid order + enrollments.

    Steps: read cart → price each course → charge (mock) → create order +
    order items → enroll in each course → clear cart → notifications.
    """
    from services.course_service import effective_price

    cart = (
        sb().table("cart_items")
        .select("course_id, courses(id, title, price, discount_price, status)")
        .eq("student_id", student["id"])
        .execute()
    ).data or []

    if not cart:
        raise ValueError("Your cart is empty")

    courses = [row["courses"] for row in cart if row.get("courses")]
    if not courses:
        raise ValueError("Your cart is empty")

    # Skip anything already owned
    owned = {
        r["course_id"]
        for r in (sb().table("enrollments").select("course_id")
                  .eq("student_id", student["id"])
                  .in_("course_id", [c["id"] for c in courses]).execute().data or [])
    }
    courses = [c for c in courses if c["id"] not in owned]
    if not courses:
        raise ValueError("You already own every course in your cart")

    total = round(sum(effective_price(c) for c in courses), 2)

    payment = process_payment(total, payment_method)
    if payment["status"] != "paid":
        raise ValueError("Payment failed — please try again")

    order = first_row(sb().table("orders").insert({
        "student_id": student["id"],
        "total_amount": total,
        "payment_status": "paid",
        "payment_method": payment_method,
        "transaction_id": payment["transaction_id"],
    }).execute())

    sb().table("order_items").insert([
        {"order_id": order["id"], "course_id": c["id"], "price": effective_price(c)}
        for c in courses
    ]).execute()

    sb().table("enrollments").upsert([
        {"student_id": student["id"], "course_id": c["id"]}
        for c in courses
    ], on_conflict="student_id,course_id").execute()

    sb().table("cart_items").delete().eq("student_id", student["id"]).execute()

    # Move any of these courses out of the wishlist
    sb().table("wishlists").delete().eq("student_id", student["id"]) \
        .in_("course_id", [c["id"] for c in courses]).execute()

    notify(
        student["id"],
        "Purchase successful 🎉",
        f"You enrolled in {len(courses)} course(s) — order total ${total:.2f}. Happy learning!",
    )
    for c in courses:
        notify(student["id"], "Enrollment confirmed", f"Welcome to “{c['title']}”.")

    order["courses"] = courses
    return order
