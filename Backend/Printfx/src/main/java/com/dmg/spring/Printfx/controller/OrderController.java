package com.dmg.spring.Printfx.controller;

import com.dmg.spring.Printfx.model.Order;
import com.dmg.spring.Printfx.model.Users;
import com.dmg.spring.Printfx.repository.UserRepository;
import com.dmg.spring.Printfx.service.OrderService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/orders")
@CrossOrigin(origins = "http://localhost:4200") // adjust the port if your frontend runs elsewhere
public class OrderController {

    @Autowired
    private OrderService orderService;

    @Autowired
    private UserRepository userRepository;

    // Returns every order (ready, in-progress, pending_approval,
    // pending_payment, submitted — everything) for the logged-in user. The
    // frontend CartComponent splits these into sections client-side by
    // status, including the newer "Approved — Awaiting Payment" section.
    @GetMapping
    public ResponseEntity<List<Order>> getMyOrders(Authentication authentication) {
        Users user = currentUser(authentication);
        return ResponseEntity.ok(orderService.getOrdersForUser(user.getId()));
    }

    // Fetches any single order by id, for the Payment page — an admin
    // landing on their own payment page after self-approving still counts
    // as "the owner" in that case, but this endpoint is deliberately not
    // ownership-scoped so it also works if that ever isn't true. Read-only,
    // low risk; revisit once there's a real role system.
    @GetMapping("/{id}")
    public ResponseEntity<Order> getOrderById(@PathVariable Long id) {
        return ResponseEntity.ok(orderService.getOrderById(id));
    }

    @PostMapping
    public ResponseEntity<Order> createOrder(@RequestBody Order order, Authentication authentication) {
        Users user = currentUser(authentication);
        return ResponseEntity.ok(orderService.createOrder(order, user));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Order> updateOrder(
            @PathVariable Long id,
            @RequestBody Order updates,
            Authentication authentication) {
        Users user = currentUser(authentication);
        return ResponseEntity.ok(orderService.updateOrder(id, user.getId(), updates));
    }

    @PostMapping("/{id}/duplicate")
    public ResponseEntity<Order> duplicateOrder(@PathVariable Long id, Authentication authentication) {
        Users user = currentUser(authentication);
        return ResponseEntity.ok(orderService.duplicateOrder(id, user.getId()));
    }

    // Finalizes a batch of "ready" orders (the "Proceed to Checkout" /
    // "Send for Approval" button). Body: { "orderIds": [1, 2, 3] }. Every
    // order requires approval — no quantity threshold skips it.
    @PostMapping("/checkout")
    public ResponseEntity<List<Order>> checkout(
            @RequestBody CheckoutRequest request,
            Authentication authentication) {
        Users user = currentUser(authentication);
        return ResponseEntity.ok(orderService.checkout(request.getOrderIds(), user.getId()));
    }

    // Approves a pending order — moves it to pending_payment, not straight
    // to submitted. Returns whether the approver IS the order's original
    // requester, so the frontend knows whether to redirect straight to the
    // Payment page (self-approval) or just close the notification (approving
    // someone else's order — that person will see it waiting for them under
    // "Approved — Awaiting Payment" next time they check their own cart).
    // No role-restriction on WHO can approve yet — any authenticated user
    // can currently hit this; restrict to admins once a proper guard exists.
    @PutMapping("/{id}/approve")
    public ResponseEntity<ApproveResponse> approveOrder(@PathVariable Long id, Authentication authentication) {
        Users approver = currentUser(authentication);
        Order order = orderService.approveOrder(id);
        boolean selfApproved = order.getUser().getId() == approver.getId();
        return ResponseEntity.ok(new ApproveResponse(order, selfApproved));
    }

    // The Payment page's "Pay" button. Ownership IS checked (in the
    // service) — only the original requester can pay for their own order.
    // Not real payment processing; this app has no payment gateway.
    @PutMapping("/{id}/pay")
    public ResponseEntity<Order> payOrder(@PathVariable Long id, Authentication authentication) {
        Users user = currentUser(authentication);
        return ResponseEntity.ok(orderService.payOrder(id, user.getId()));
    }

    // The notification dropdown's "Reject" button. Same no-ownership-check
    // reasoning as approve — the rejecter isn't the requester. The
    // requester gets a notification about the rejection (see
    // NotificationService.notifyRequesterOfRejection).
    @PutMapping("/{id}/reject")
    public ResponseEntity<Order> rejectOrder(@PathVariable Long id) {
        return ResponseEntity.ok(orderService.rejectOrder(id));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteOrder(@PathVariable Long id, Authentication authentication) {
        Users user = currentUser(authentication);
        orderService.deleteOrder(id, user.getId());
        return ResponseEntity.noContent().build();
    }

    // authentication.getName() returns the value JwtAuthenticationFilter put
    // into the principal — the user's email, from
    // JWTUtil.getEmailFromToken(token). Your UserRepository only exposes
    // findByUsername(String), so the "username" column is apparently where
    // that email is actually stored — that's why this still works.
    private Users currentUser(Authentication authentication) {
        String email = authentication.getName();
        Users user = userRepository.findByUsername(email);
        if (user == null) {
            throw new RuntimeException("User not found: " + email);
        }
        return user;
    }

    // Small request-body shape for POST /api/orders/checkout.
    public static class CheckoutRequest {
        private List<Long> orderIds;

        public List<Long> getOrderIds() {
            return orderIds;
        }

        public void setOrderIds(List<Long> orderIds) {
            this.orderIds = orderIds;
        }
    }

    // Response shape for PUT /api/orders/{id}/approve — bundles the updated
    // order with a flag telling the frontend whether the approver is also
    // the requester.
    public static class ApproveResponse {
        private Order order;
        private boolean selfApproved;

        public ApproveResponse(Order order, boolean selfApproved) {
            this.order = order;
            this.selfApproved = selfApproved;
        }

        public Order getOrder() {
            return order;
        }

        public void setOrder(Order order) {
            this.order = order;
        }

        public boolean isSelfApproved() {
            return selfApproved;
        }

        public void setSelfApproved(boolean selfApproved) {
            this.selfApproved = selfApproved;
        }
    }
}