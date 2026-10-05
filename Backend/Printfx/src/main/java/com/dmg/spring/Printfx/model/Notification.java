package com.dmg.spring.Printfx.model;

import jakarta.persistence.*;
import com.fasterxml.jackson.annotation.JsonIgnore;
import java.time.LocalDateTime;

@Entity
@Table(name = "notification")
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String message;

    // Distinguishes what kind of notification this is:
    //   "approval_request" - order needs approval, sent to admins (Approve/Reject)
    //   "rejection_notice"  - order was rejected, sent to the requester (info only)
    //   "signup_request"    - new user signed up, sent to admins (Approve/Reject)
    @Column(nullable = false)
    private String type;

    // The order this notification is about. NULL for signup notifications.
    // NOTE: the existing column is NOT NULL; run the ALTER TABLE in the
    // instructions once so signup notifications can be saved.
    @Column(nullable = true)
    private Long orderId;

    // The user who signed up, for "signup_request" notifications. NULL otherwise.
    @Column(name = "related_user_id")
    private Integer relatedUserId;

    // One row per admin recipient (fan-out), so read/unread is per user.
    // @JsonIgnore: Jackson can't serialize a Hibernate lazy proxy; the
    // frontend uses getRecipientUserId() instead.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "recipient_user_id", nullable = false)
    @JsonIgnore
    private Users recipient;

    // "read" is a reserved word in MySQL, hence the explicit column name.
    @Column(name = "is_read", nullable = false)
    private boolean read = false;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdDate;

    @PrePersist
    protected void onCreate() {
        this.createdDate = LocalDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public Long getOrderId() {
        return orderId;
    }

    public void setOrderId(Long orderId) {
        this.orderId = orderId;
    }

    public Integer getRelatedUserId() {
        return relatedUserId;
    }

    public void setRelatedUserId(Integer relatedUserId) {
        this.relatedUserId = relatedUserId;
    }

    public Users getRecipient() {
        return recipient;
    }

    public void setRecipient(Users recipient) {
        this.recipient = recipient;
    }

    // Safe on an uninitialized lazy proxy; serialized as "recipientUserId".
    public Integer getRecipientUserId() {
        return recipient != null ? recipient.getId() : null;
    }

    public boolean isRead() {
        return read;
    }

    public void setRead(boolean read) {
        this.read = read;
    }

    public LocalDateTime getCreatedDate() {
        return createdDate;
    }
}