package com.dmg.spring.Printfx.model;

import jakarta.persistence.*;

/** A product category within one company, e.g. "Business Cards" for Scott. */
@Entity
@Table(
    name = "category",
    uniqueConstraints = @UniqueConstraint(columnNames = {"company_id", "name"})
)
public class Category {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "company_id", nullable = false)
    private Long companyId;

    @Column(nullable = false, length = 100)
    private String name;

    // Tiles are shown in this order (1, 2, 3...)
    @Column(name = "display_order", nullable = false)
    private int displayOrder;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getCompanyId() { return companyId; }
    public void setCompanyId(Long companyId) { this.companyId = companyId; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public int getDisplayOrder() { return displayOrder; }
    public void setDisplayOrder(int displayOrder) { this.displayOrder = displayOrder; }
}