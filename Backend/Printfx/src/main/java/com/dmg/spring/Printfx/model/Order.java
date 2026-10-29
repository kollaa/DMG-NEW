package com.dmg.spring.Printfx.model;

import jakarta.persistence.*;
import com.dmg.spring.Printfx.util.ThumbnailUtil;
import com.fasterxml.jackson.annotation.JsonIgnore;
import java.time.LocalDateTime;

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

    // Snapshot of the customized card. Shrunk to a small JPEG before saving
    // (see shrinkThumbnails() below) so the cart loads fast.
    @Lob
    @Column(columnDefinition = "LONGTEXT")
    private String thumbnailDataUrl;

    // Same idea, but for the back of the card — only populated for
    // products that actually have a back design (product.imageUrlBack).
    @Lob
    @Column(columnDefinition = "LONGTEXT")
    private String thumbnailDataUrlBack;

    // JSON-encoded form field values (fullName, title, address, etc.)
    @Lob
    @Column(columnDefinition = "TEXT")
    private String formDetails;

    // Owner of this order.
    // @JsonIgnore: Jackson can't serialize a Hibernate lazy proxy;
    // the frontend uses getUserId() instead.
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
        shrinkThumbnails();
    }

    @PreUpdate
    protected void onUpdate() {
        this.modifiedDate = LocalDateTime.now();
        shrinkThumbnails();
    }

    // Large PNG previews (often 500 KB+) become small JPEGs (~30-60 KB).
    // Already-small images are left as they are.
    private void shrinkThumbnails() {
        this.thumbnailDataUrl = ThumbnailUtil.shrink(this.thumbnailDataUrl);
        this.thumbnailDataUrlBack = ThumbnailUtil.shrink(this.thumbnailDataUrlBack);
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

    // Safe on an uninitialized lazy proxy; serialized as "userId".
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