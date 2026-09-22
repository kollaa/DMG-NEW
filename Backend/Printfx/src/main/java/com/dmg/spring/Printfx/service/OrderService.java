package com.dmg.spring.Printfx.service;

import com.dmg.spring.Printfx.model.Order;
import com.dmg.spring.Printfx.model.Users;
import com.dmg.spring.Printfx.repository.OrderRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class OrderService {

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private JavaMailSender mailSender;

    @Autowired
    private NotificationService notificationService;

    // Add these two properties to application.properties:
    //   dmg.approval-email=someone@dmg-example.com
    //   spring.mail.username=<the account JavaMailSender sends from>
    // (spring.mail.* also needs host/port/password — see the note further
    // down by sendApprovalRequestEmail().)
    @Value("${dmg.approval-email}")
    private String dmgApprovalEmail;

    @Value("${spring.mail.username}")
    private String fromAddress;

    // Order status constants — kept as plain strings (not a Java enum) so
    // they match exactly what the frontend sends/expects.
    //
    // Lifecycle: ready -> pending_approval -> pending_payment -> submitted
    //   ready             = sitting in the cart
    //   pending_approval  = "Send for Approval" clicked, waiting on an admin
    //   pending_payment   = an admin approved it; now waiting on payment
    //   submitted         = paid, fully finalized
    public static final String STATUS_READY = "ready";
    public static final String STATUS_IN_PROGRESS = "in-progress";
    public static final String STATUS_PENDING_APPROVAL = "pending_approval";
    public static final String STATUS_PENDING_PAYMENT = "pending_payment";
    public static final String STATUS_SUBMITTED = "submitted";
    public static final String STATUS_REJECTED = "rejected";

    public List<Order> getOrdersForUser(int userId) {
        return orderRepository.findByUser_IdOrderByModifiedDateDesc(userId);
    }

    // Fetches a single order by id, regardless of who owns it. Used by the
    // Payment page — an admin who just approved someone else's order isn't
    // that order's owner, but still needs to be able to look it up (e.g. to
    // land on their OWN payment page after self-approving). No ownership
    // check here; this is read-only and low-risk, but worth revisiting once
    // there's a real role system.
    public Order getOrderById(Long id) {
        return orderRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Order not found: " + id));
    }

    public Order createOrder(Order order, Users user) {
        order.setUser(user);
        order.setId(null);       // safety: never trust a client-supplied id on create
        order.setOrderCode(null);

        // Save once to get a DB-generated id, then stamp the order code using
        // that id. This avoids the race condition an in-memory counter would
        // have if two requests hit "create" at the same instant.
        Order saved = orderRepository.save(order);
        saved.setOrderCode(String.format("D-DMG-%08d", saved.getId()));
        return orderRepository.save(saved);
    }

    public Order updateOrder(Long id, int userId, Order updates) {
        Order existing = getOwnedOrder(id, userId);
        existing.setQuantity(updates.getQuantity());
        existing.setPrice(updates.getPrice());
        existing.setStatus(updates.getStatus());
        existing.setPercentComplete(updates.getPercentComplete());
        existing.setFormDetails(updates.getFormDetails());
        existing.setThumbnailDataUrl(updates.getThumbnailDataUrl());
        existing.setThumbnailDataUrlBack(updates.getThumbnailDataUrlBack());
        return orderRepository.save(existing);
    }

    public void deleteOrder(Long id, int userId) {
        Order existing = getOwnedOrder(id, userId);
        orderRepository.delete(existing);
    }

    public Order duplicateOrder(Long id, int userId) {
        Order original = getOwnedOrder(id, userId);

        Order copy = new Order();
        copy.setProductId(original.getProductId());
        copy.setCompanyId(original.getCompanyId());
        copy.setProductName(original.getProductName());
        copy.setCompanyName(original.getCompanyName());
        copy.setQuantity(original.getQuantity());
        copy.setPrice(original.getPrice());
        copy.setStatus(original.getStatus());
        copy.setPercentComplete(original.getPercentComplete());
        copy.setThumbnailDataUrl(original.getThumbnailDataUrl());
        copy.setFormDetails(original.getFormDetails());

        return createOrder(copy, original.getUser());
    }

    // Finalizes a batch of "ready" orders at checkout. EVERY order goes to
    // pending_approval and triggers a real email to DMG — there is no
    // quantity threshold that lets small orders skip approval; every order
    // requires approval, including an admin's own.
    public List<Order> checkout(List<Long> orderIds, int userId) {
        List<Order> results = new java.util.ArrayList<>();

        for (Long id : orderIds) {
            Order order = getOwnedOrder(id, userId);

            if (!STATUS_READY.equals(order.getStatus())) {
                // Skip anything that isn't actually "ready" (already
                // submitted, still in-progress, etc.) rather than erroring
                // out the whole batch over one bad id.
                continue;
            }

            order.setStatus(STATUS_PENDING_APPROVAL);
            orderRepository.save(order);

            // Email and notifications are independent side effects — a
            // broken/unconfigured mail server should never prevent the
            // in-app notification from being created (and shouldn't abort
            // the rest of a multi-order checkout batch either).
            try {
                sendApprovalRequestEmail(order);
            } catch (Exception e) {
                System.out.println("[WARN] Failed to send approval email for order "
                        + order.getOrderCode() + ": " + e.getMessage());
            }

            notificationService.notifyAdminsOfPendingApproval(order);

            results.add(order);
        }

        return results;
    }

    // Called when an approver approves a pending order (see
    // OrderController's PUT /api/orders/{id}/approve). No ownership check
    // here on purpose — the approver isn't necessarily the requester.
    // Moves to pending_payment, NOT straight to submitted — approving
    // unlocks payment, it doesn't finalize the order by itself. There is no
    // role-restriction on WHO can call this yet; any authenticated user can
    // currently hit it — restrict to admins once a proper guard exists.
    public Order approveOrder(Long id) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Order not found: " + id));

        if (!STATUS_PENDING_APPROVAL.equals(order.getStatus())) {
            throw new RuntimeException("Order is not pending approval: " + id);
        }

        order.setStatus(STATUS_PENDING_PAYMENT);
        return orderRepository.save(order);
    }

    // Finalizes payment for an order that's pending_payment. Ownership IS
    // checked here — only the original requester can pay for their own
    // order. This is a manual/internal confirmation step, NOT real payment
    // gateway processing; this app has no payment integration. Clicking
    // "Pay" on the Payment page is what calls this.
    public Order payOrder(Long id, int userId) {
        Order order = getOwnedOrder(id, userId);

        if (!STATUS_PENDING_PAYMENT.equals(order.getStatus())) {
            throw new RuntimeException("Order is not pending payment: " + id);
        }

        order.setStatus(STATUS_SUBMITTED);
        return orderRepository.save(order);
    }

    // Rejects a pending order — called from the notification dropdown's
    // "Reject" button. No ownership check here for the same reason as
    // approveOrder(): the person rejecting isn't the requester. Notifies
    // the original requester so the rejection isn't silent.
    public Order rejectOrder(Long id) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Order not found: " + id));

        if (!STATUS_PENDING_APPROVAL.equals(order.getStatus())) {
            throw new RuntimeException("Order is not pending approval: " + id);
        }

        order.setStatus(STATUS_REJECTED);
        Order saved = orderRepository.save(order);
        notificationService.notifyRequesterOfRejection(saved);
        return saved;
    }

    // Sends a real email to DMG requesting approval for this order.
    //
    // Requires application.properties to have:
    //   spring.mail.host=smtp.gmail.com          (or your provider's SMTP host)
    //   spring.mail.port=587
    //   spring.mail.username=your-sending-address@example.com
    //   spring.mail.password=<app password / SMTP password>
    //   spring.mail.properties.mail.smtp.auth=true
    //   spring.mail.properties.mail.smtp.starttls.enable=true
    //   dmg.approval-email=whoever-should-approve@dmg-example.com
    //
    // Also requires the spring-boot-starter-mail dependency in pom.xml:
    //   <dependency>
    //       <groupId>org.springframework.boot</groupId>
    //       <artifactId>spring-boot-starter-mail</artifactId>
    //   </dependency>
    private void sendApprovalRequestEmail(Order order) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(fromAddress);
        message.setTo(dmgApprovalEmail);
        message.setSubject("Order approval needed: " + order.getOrderCode());
        message.setText(
                "An order is awaiting your approval.\n\n"
                        + "Order code: " + order.getOrderCode() + "\n"
                        + "Company: " + order.getCompanyName() + "\n"
                        + "Product: " + order.getProductName() + "\n"
                        + "Quantity: " + order.getQuantity() + "\n"
                        + "Requested by: " + order.getUser().getUsername() + "\n"
        );
        mailSender.send(message);
    }

    // Loads an order and verifies it belongs to the requesting user.
    // Never let one user fetch, edit, or delete another user's order.
    // userId is a primitive int here (matching Users.getId()'s return type),
    // so we compare with != rather than .equals() — primitives have no
    // .equals() method.
    private Order getOwnedOrder(Long id, int userId) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Order not found: " + id));
        if (order.getUser().getId() != userId) {
            throw new RuntimeException("Not authorized to access this order");
        }
        return order;
    }
}