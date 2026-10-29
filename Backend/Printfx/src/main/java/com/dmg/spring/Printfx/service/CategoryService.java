package com.dmg.spring.Printfx.service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.dmg.spring.Printfx.model.Category;
import com.dmg.spring.Printfx.model.ProductCategory;
import com.dmg.spring.Printfx.repository.CategoryRepository;
import com.dmg.spring.Printfx.repository.ProductCategoryRepository;

@Service
public class CategoryService {

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private ProductCategoryRepository productCategoryRepository;

    /** Categories (in display order) with product counts, plus how many products have no category. */
    public Map<String, Object> listForCompany(Long companyId) {
        Map<Long, Long> counts = new HashMap<>();
        for (Object[] row : productCategoryRepository.countByCategoryForCompany(companyId)) {
            counts.put(((Number) row[0]).longValue(), ((Number) row[1]).longValue());
        }

        List<Map<String, Object>> categories = new ArrayList<>();
        for (Category c : categoryRepository.findByCompanyIdOrderByDisplayOrderAscNameAsc(companyId)) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", c.getId());
            m.put("name", c.getName());
            m.put("displayOrder", c.getDisplayOrder());
            m.put("productCount", counts.getOrDefault(c.getId(), 0L));
            categories.add(m);
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("categories", categories);
        result.put("uncategorizedCount", productCategoryRepository.findUncategorizedProductIds(companyId).size());
        return result;
    }

    public List<Long> productIdsInCategory(Long companyId, Long categoryId) {
        return toLongs(productCategoryRepository.findProductIdsInCategory(companyId, categoryId));
    }

    public List<Long> uncategorizedProductIds(Long companyId) {
        return toLongs(productCategoryRepository.findUncategorizedProductIds(companyId));
    }

    public boolean nameExists(Long companyId, String name) {
        return categoryRepository.existsByCompanyIdAndNameIgnoreCase(companyId, name);
    }

    /** New categories go to the end of the list. */
    @Transactional
    public Category create(Long companyId, String name) {
        Category c = new Category();
        c.setCompanyId(companyId);
        c.setName(name);
        c.setDisplayOrder(categoryRepository.findMaxDisplayOrder(companyId) + 1);
        return categoryRepository.save(c);
    }

    public Optional<Category> find(Long companyId, Long categoryId) {
        return categoryRepository.findByIdAndCompanyId(categoryId, companyId);
    }

    public boolean productBelongsToCompany(Long productId, Long companyId) {
        return productCategoryRepository.countProductInCompany(productId, companyId) > 0;
    }

    /** Puts a product in a category (moves it if it was already in another one). */
    @Transactional
    public void assign(Long productId, Long categoryId) {
        ProductCategory pc = productCategoryRepository.findByProductId(productId).orElseGet(ProductCategory::new);
        pc.setProductId(productId);
        pc.setCategoryId(categoryId);
        productCategoryRepository.save(pc);
    }

    /** Deleting a category keeps its products; they become "Uncategorized". */
    @Transactional
    public void delete(Category category) {
        productCategoryRepository.deleteByCategoryId(category.getId());
        categoryRepository.delete(category);
    }

    private static List<Long> toLongs(List<Object> values) {
        List<Long> ids = new ArrayList<>(values.size());
        for (Object v : values) {
            ids.add(((Number) v).longValue());
        }
        return ids;
    }
}