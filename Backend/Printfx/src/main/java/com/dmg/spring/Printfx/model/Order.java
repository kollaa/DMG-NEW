package com.dmg.spring.Printfx.model;

import jakarta.persistence.*;
import com.fasterxml.jackson.annotation.JsonIgnore;
import java.time.LocalDateTime;

// If your project is on Spring Boot 2.x rather than 3.x, change the
// "jakarta.persistence.*" import above to "javax.persistence.*" instead —
// check whichever your existing entities (Company, Customer, Users) use.

@Entity
@Table(name = "orders")
public class Order {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true)
    private String orderCode; // e.g. "D-DMG-00000046" — assigned after first save, see OrderService

    @Column(nullable = false)
    private Long productId;

    @Column(nullable = false)
    private Long companyId;

    @Column(nullable = false)
    private String productName;

    @Column(nullable = false)
    private String companyName;

    @Column(nullable = false)
    private Integer quantity;

    @Column(nullable = false)
    private Double price;

    // Kept as the exact frontend strings ("ready" / "in-progress") rather
    // than a Java enum, so no translation layer is needed between the two.
    @Column(nullable = false)
    private String status;

    @Column(nullable = false)
    private Integer percentComplete;

    // Base64 PNG snapshot of the customized card canvas. Can be large —
    // @Lob maps this to a TEXT/CLOB column instead of a small VARCHAR.
    @Lob
    @Column(columnDefinition = "TEXT")
    private String thumbnailDataUrl;

    // Same idea, but for the back of the card — only populated for
    // products that actually have a back design (product.imageUrlBack).
    @Lob
    @Column(columnDefinition = "TEXT")
    private String thumbnailDataUrlBack;

    // JSON-encoded form field values (fullName, title, address, etc.),
    // stored as a raw string. Serialize/deserialize with Jackson's
    // ObjectMapper on the way in/out if you want it typed on the Java side.
    @Lob
    @Column(columnDefinition = "TEXT")
    private String formDetails;

    // Owner of this order. Adjust the relationship/column name if your
    // Users entity's primary key type or field name differs.
    //
    // @JsonIgnore is important here: Jackson has no idea how to serialize
    // a Hibernate lazy proxy (Users$HibernateProxy) — trying to include
    // this field directly in a JSON response throws
    // InvalidDefinitionException ("no properties discovered") and corrupts
    // the response mid-stream. The frontend never actually needs the full
    // nested Users object anyway — see getUserId() below for the one thing
    // it does need.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @JsonIgnore
    private Users user;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdDate;

    @Column(nullable = false)
    private LocalDateTime modifiedDate;

    @PrePersist
    protected void onCreate() {
        this.createdDate = LocalDateTime.now();
        this.modifiedDate = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.modifiedDate = LocalDateTime.now();
    }

    // ── Getters / setters ────────────────────────────────────────────

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getOrderCode() {
        return orderCode;
    }

    public void setOrderCode(String orderCode) {
        this.orderCode = orderCode;
    }

    public Long getProductId() {
        return productId;
    }

    public void setProductId(Long productId) {
        this.productId = productId;
    }

    public Long getCompanyId() {
        return companyId;
    }

    public void setCompanyId(Long companyId) {
        this.companyId = companyId;
    }

    public String getProductName() {
        return productName;
    }

    public void setProductName(String productName) {
        this.productName = productName;
    }

    public String getCompanyName() {
        return companyName;
    }

    public void setCompanyName(String companyName) {
        this.companyName = companyName;
    }

    public Integer getQuantity() {
        return quantity;
    }

    public void setQuantity(Integer quantity) {
        this.quantity = quantity;
    }

    public Double getPrice() {
        return price;
    }

    public void setPrice(Double price) {
        this.price = price;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public Integer getPercentComplete() {
        return percentComplete;
    }

    public void setPercentComplete(Integer percentComplete) {
        this.percentComplete = percentComplete;
    }

    public String getThumbnailDataUrl() {
        return thumbnailDataUrl;
    }

    public void setThumbnailDataUrl(String thumbnailDataUrl) {
        this.thumbnailDataUrl = thumbnailDataUrl;
    }

    public String getThumbnailDataUrlBack() {
        return thumbnailDataUrlBack;
    }

    public void setThumbnailDataUrlBack(String thumbnailDataUrlBack) {
        this.thumbnailDataUrlBack = thumbnailDataUrlBack;
    }

    public String getFormDetails() {
        return formDetails;
    }

    public void setFormDetails(String formDetails) {
        this.formDetails = formDetails;
    }

    public Users getUser() {
        return user;
    }

    public void setUser(Users user) {
        this.user = user;
    }

    // Safe to call even on an uninitialized lazy proxy — Hibernate can
    // return an entity's id without needing to actually load the rest of
    // it from the database. This is what Jackson actually serializes as
    // "userId" in the JSON response, instead of the ignored "user" field.
    public Integer getUserId() {
        return user != null ? user.getId() : null;
    }

    public LocalDateTime getCreatedDate() {
        return createdDate;
    }

    public LocalDateTime getModifiedDate() {
        return modifiedDate;
    }

    public void setModifiedDate(LocalDateTime modifiedDate) {
        this.modifiedDate = modifiedDate;
    }
}