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

    // Distinguishes what kind of notification this is, so the frontend
    // knows whether to show Approve/Reject actions or just display the
    // message as informational:
    //   "approval_request" — sent to admins, has Approve/Reject buttons
    //   "rejection_notice"  — sent to the requester, informational only
    @Column(nullable = false)
    private String type;

    // The order this notification is about, so the UI can offer an
    // "Approve" action directly from the notification itself.
    @Column(nullable = false)
    private Long orderId;

    // Who this notification is for. One row is created per admin recipient
    // at the time an order goes pending_approval (a "fan-out" rather than
    // one shared notification), so read/unread status is per-user.
    //
    // @JsonIgnore for the same reason as Order.user: Jackson can't
    // serialize a Hibernate lazy proxy, and this field is never touched
    // before getMyNotifications() returns the raw list — see getRecipientUserId()
    // below for the safe, id-only alternative the frontend actually needs.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "recipient_user_id", nullable = false)
    @JsonIgnore
    private Users recipient;

    // Explicit column name here: "read" is a reserved word in MySQL
    // (used in LOCK TABLES ... READ), so mapping this field to a column
    // literally named "read" causes CREATE TABLE to fail with a silent
    // schema-migration error — Hibernate logs it as a warning rather than
    // halting, then the *next* migration step (adding a foreign key onto
    // a table that was never actually created) is what actually surfaces
    // as a visible startup error, which is misleading if you don't know
    // to look one step earlier.
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

    public Users getRecipient() {
        return recipient;
    }

    public void setRecipient(Users recipient) {
        this.recipient = recipient;
    }

    // Safe on an uninitialized lazy proxy — Hibernate can return an id
    // without loading the rest of the entity. Jackson serializes this as
    // "recipientUserId" in the JSON response instead of the ignored field.
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