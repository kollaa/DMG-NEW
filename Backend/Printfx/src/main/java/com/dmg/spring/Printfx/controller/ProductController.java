package com.dmg.spring.Printfx.controller;

import com.dmg.spring.Printfx.model.Product;
import com.dmg.spring.Printfx.service.ProductService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/companies/{companyId}/products")
@CrossOrigin("http://localhost:4200")
public class ProductController {

    @Autowired
    private ProductService productService;

    @GetMapping
    public List<Product> getProducts(@PathVariable Long companyId) {
        return productService.getProductsByCompany(companyId);
    }
    
    @PostMapping
    public ResponseEntity<Product> createProduct(
            @PathVariable Long companyId,
            @RequestBody Product product) {
        Product saved = productService.saveProduct(companyId, product);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    // PUT - Update existing product
    @PutMapping("/{productId}")
    public ResponseEntity<Product> updateProduct(
            @PathVariable Long companyId,
            @PathVariable Long productId,
            @RequestBody Product product) {
        Product updated = productService.updateProduct(companyId, productId, product);
        return ResponseEntity.ok(updated);
    }
}