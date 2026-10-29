package com.dmg.spring.Printfx.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.dmg.spring.Printfx.model.ProductCategory;

/*
 * The native queries join the existing `products` table (columns `id`, `company_id`)
 * so deleted products never get counted. If your products table is named
 * differently, change `products` below.
 */
@Repository
public interface ProductCategoryRepository extends JpaRepository<ProductCategory, Long> {

    Optional<ProductCategory> findByProductId(Long productId);

    void deleteByCategoryId(Long categoryId);

    // [categoryId, productCount] for one company
    @Query(value = "SELECT pc.category_id, COUNT(*) FROM product_category pc "
            + "JOIN products p ON p.id = pc.product_id "
            + "WHERE p.company_id = :companyId GROUP BY pc.category_id",
            nativeQuery = true)
    List<Object[]> countByCategoryForCompany(@Param("companyId") Long companyId);

    @Query(value = "SELECT p.id FROM products p "
            + "JOIN product_category pc ON pc.product_id = p.id "
            + "WHERE p.company_id = :companyId AND pc.category_id = :categoryId",
            nativeQuery = true)
    List<Object> findProductIdsInCategory(@Param("companyId") Long companyId,
                                          @Param("categoryId") Long categoryId);

    @Query(value = "SELECT p.id FROM products p "
            + "WHERE p.company_id = :companyId "
            + "AND NOT EXISTS (SELECT 1 FROM product_category pc WHERE pc.product_id = p.id)",
            nativeQuery = true)
    List<Object> findUncategorizedProductIds(@Param("companyId") Long companyId);

    @Query(value = "SELECT COUNT(*) FROM products p WHERE p.id = :productId AND p.company_id = :companyId",
            nativeQuery = true)
    long countProductInCompany(@Param("productId") Long productId, @Param("companyId") Long companyId);
}