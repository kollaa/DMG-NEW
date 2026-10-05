package com.dmg.spring.Printfx.service;

import com.dmg.spring.Printfx.model.Notification;
import com.dmg.spring.Printfx.model.Order;
import com.dmg.spring.Printfx.model.Role;
import com.dmg.spring.Printfx.model.Users;
import com.dmg.spring.Printfx.repository.NotificationRepository;
import com.dmg.spring.Printfx.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import jakarta.transaction.Transactional;

import java.util.List;

@Service
public class NotificationService {

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private NotificationStreamService notificationStreamService;

    public static final String TYPE_APPROVAL_REQUEST = "approval_request";
    public static final String TYPE_REJECTION_NOTICE = "rejection_notice";
    public static final String TYPE_SIGNUP_REQUEST = "signup_request";

    public List<Notification> getNotificationsForUser(int userId) {
        return notificationRepository.findByRecipient_IdOrderByCreatedDateDesc(userId);
    }

    public Notification markRead(Long id, int userId) {
        Notification notification = notificationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Notification not found: " + id));
        if (notification.getRecipient().getId() != userId) {
            throw new RuntimeException("Not authorized to access this notification");
        }
        notification.setRead(true);
        return notificationRepository.save(notification);
    }

    // One notification per admin for an order that just went pending_approval.
    public void notifyAdminsOfPendingApproval(Order order) {
        String message = "Order " + order.getOrderCode() + " ("
                + order.getProductName() + " x" + order.getQuantity()
                + ", " + order.getCompanyName() + ") needs your approval.";

        for (Users admin : findAdmins()) {
            Notification notification = new Notification();
            notification.setMessage(message);
            notification.setType(TYPE_APPROVAL_REQUEST);
            notification.setOrderId(order.getId());
            notification.setRecipient(admin);
            notificationRepository.save(notification);
            notificationStreamService.notifyUserAfterCommit(admin.getId());
        }
    }

    // One notification per admin for a new signup waiting for approval.
    public void notifyAdminsOfSignup(Users newUser) {
        String name = newUser.getFullName() != null ? newUser.getFullName() : newUser.getUsername();
        String message = "New signup: " + name + " (" + newUser.getUsername() + ") is waiting for approval.";

        for (Users admin : findAdmins()) {
            Notification notification = new Notification();
            notification.setMessage(message);
            notification.setType(TYPE_SIGNUP_REQUEST);
            notification.setRelatedUserId(newUser.getId());
            notification.setRecipient(admin);
            notificationRepository.save(notification);
            notificationStreamService.notifyUserAfterCommit(admin.getId());
        }
    }

    // Once any admin approves/rejects a signup, mark every admin's copy as read
    // so it stops showing as unread in everyone's bell.
    @Transactional
    public void resolveSignupNotifications(int newUserId) {
        List<Notification> notifications =
                notificationRepository.findByTypeAndRelatedUserId(TYPE_SIGNUP_REQUEST, newUserId);
        for (Notification n : notifications) {
            n.setRead(true);
        }
        notificationRepository.saveAll(notifications);
        // Clear it from every admin's bell right away
        for (Notification n : notifications) {
            notificationStreamService.notifyUserAfterCommit(n.getRecipientUserId());
        }
    }

    // Single-recipient notification when a requester's order is rejected.
    public void notifyRequesterOfRejection(Order order) {
        String message = "Your order " + order.getOrderCode() + " ("
                + order.getProductName() + " x" + order.getQuantity()
                + ") was rejected.";

        Notification notification = new Notification();
        notification.setMessage(message);
        notification.setType(TYPE_REJECTION_NOTICE);
        notification.setOrderId(order.getId());
        notification.setRecipient(order.getUser());
        notificationRepository.save(notification);
        notificationStreamService.notifyUserAfterCommit(notification.getRecipientUserId());
    }

    private List<Users> findAdmins() {
        return userRepository.findAll().stream()
                .filter(this::isAdmin)
                .toList();
    }

    private boolean isAdmin(Users user) {
        if (user.getRoleList() == null) {
            return false;
        }
        return user.getRoleList().stream()
                .map(Role::getName)
                .filter(name -> name != null)
                .anyMatch(name -> name.equalsIgnoreCase("ADMIN"));
    }
}