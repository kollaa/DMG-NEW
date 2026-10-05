package com.dmg.spring.Printfx.service;

import com.dmg.spring.Printfx.model.Company;
import com.dmg.spring.Printfx.model.Product;
import com.dmg.spring.Printfx.repository.CompanyRepository;
import com.dmg.spring.Printfx.repository.ProductRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ProductService {

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private CompanyRepository companyRepository;

    public List<Product> getProductsByCompany(Long companyId) {
        return productRepository.findByCompanyId(companyId);
    }

    public Product saveProduct(Long companyId, Product product) {
        // Fetch the real Company object and link it
        Company company = companyRepository.findById(companyId)
            .orElseThrow(() -> new RuntimeException("Company not found: " + companyId));
        product.setCompany(company);
        return productRepository.save(product);
    }

    public Product updateProduct(Long companyId, Long productId, Product updatedData) {
        Product existing = productRepository.findById(productId)
            .orElseThrow(() -> new RuntimeException("Product not found: " + productId));

        // Update only your exact fields
        existing.setName(updatedData.getName());
        existing.setDescription(updatedData.getDescription());
        existing.setImageUrl(updatedData.getImageUrl());
        existing.setImageUrlBack(updatedData.getImageUrlBack());

        return productRepository.save(existing);
    }
}