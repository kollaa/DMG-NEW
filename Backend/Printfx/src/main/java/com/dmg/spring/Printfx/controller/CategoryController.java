package com.dmg.spring.Printfx.controller;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.dmg.spring.Printfx.model.Category;
import com.dmg.spring.Printfx.service.CategoryService;

/*
 * Security (from SecurityConfig, because these live under /api/companies/**):
 *   GET                     -> anyone
 *   POST / PUT / DELETE     -> admins only
 */
@RestController
@RequestMapping("/api/companies/{companyId}/categories")
public class CategoryController {

    @Autowired
    private CategoryService categoryService;

    // { categories: [{id, name, displayOrder, productCount}], uncategorizedCount }
    @GetMapping
    public ResponseEntity<Map<String, Object>> list(@PathVariable Long companyId) {
        return ResponseEntity.ok(categoryService.listForCompany(companyId));
    }

    @GetMapping("/uncategorized/product-ids")
    public ResponseEntity<List<Long>> uncategorizedProductIds(@PathVariable Long companyId) {
        return ResponseEntity.ok(categoryService.uncategorizedProductIds(companyId));
    }

    @GetMapping("/{categoryId}/product-ids")
    public ResponseEntity<List<Long>> productIds(@PathVariable Long companyId, @PathVariable Long categoryId) {
        return ResponseEntity.ok(categoryService.productIdsInCategory(companyId, categoryId));
    }

    @PostMapping
    public ResponseEntity<?> create(@PathVariable Long companyId, @RequestBody Map<String, String> body) {
        String name = body.get("name") == null ? "" : body.get("name").trim();
        if (name.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Category name is required."));
        }
        if (name.length() > 100) {
            return ResponseEntity.badRequest().body(Map.of("error", "Category name is too long."));
        }
        if (categoryService.nameExists(companyId, name)) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("error", "A category with this name already exists."));
        }
        Category created = categoryService.create(companyId, name);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{categoryId}/products/{productId}")
    public ResponseEntity<?> assign(@PathVariable Long companyId,
                                    @PathVariable Long categoryId,
                                    @PathVariable Long productId) {
        if (categoryService.find(companyId, categoryId).isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Category not found."));
        }
        if (!categoryService.productBelongsToCompany(productId, companyId)) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Product not found."));
        }
        categoryService.assign(productId, categoryId);
        return ResponseEntity.ok(Map.of("message", "Product category updated."));
    }

    @DeleteMapping("/{categoryId}")
    public ResponseEntity<?> delete(@PathVariable Long companyId, @PathVariable Long categoryId) {
        Optional<Category> category = categoryService.find(companyId, categoryId);
        if (category.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Category not found."));
        }
        categoryService.delete(category.get());
        return ResponseEntity.ok(Map.of("message", "Category deleted."));
    }
}