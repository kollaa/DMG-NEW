package com.dmg.spring.Printfx.repository;

import com.dmg.spring.Printfx.model.Notification;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    List<Notification> findByRecipient_IdOrderByCreatedDateDesc(int recipientUserId);

    // All admins' copies of the signup notification for one new user
    List<Notification> findByTypeAndRelatedUserId(String type, Integer relatedUserId);
}