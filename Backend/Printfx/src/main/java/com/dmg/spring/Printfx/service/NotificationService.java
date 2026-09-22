package com.dmg.spring.Printfx.service;

import com.dmg.spring.Printfx.model.Notification;
import com.dmg.spring.Printfx.model.Order;
import com.dmg.spring.Printfx.model.Role;
import com.dmg.spring.Printfx.model.Users;
import com.dmg.spring.Printfx.repository.NotificationRepository;
import com.dmg.spring.Printfx.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class NotificationService {

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private UserRepository userRepository;

    // Notification type constants — match Notification.getType()'s doc comment.
    public static final String TYPE_APPROVAL_REQUEST = "approval_request";
    public static final String TYPE_REJECTION_NOTICE = "rejection_notice";

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

    // Fans out one notification per admin, for a single order that just
    // went pending_approval. "Admin" is any user with a Role whose name
    // equals "ADMIN" (case-insensitive) — double check that matches the
    // actual value in your role table's name column.
    public void notifyAdminsOfPendingApproval(Order order) {
        List<Users> admins = userRepository.findAll().stream()
                .filter(this::isAdmin)
                .toList();

        String message = "Order " + order.getOrderCode() + " ("
                + order.getProductName() + " x" + order.getQuantity()
                + ", " + order.getCompanyName() + ") needs your approval.";

        for (Users admin : admins) {
            Notification notification = new Notification();
            notification.setMessage(message);
            notification.setType(TYPE_APPROVAL_REQUEST);
            notification.setOrderId(order.getId());
            notification.setRecipient(admin);
            notificationRepository.save(notification);
        }
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

    // Single-recipient notification for the original requester when their
    // order gets rejected — different from notifyAdminsOfPendingApproval(),
    // which fans out to every admin. This targets exactly one person.
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
    }
}