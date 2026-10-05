package com.dmg.spring.Printfx.controller;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import com.dmg.spring.Printfx.model.Company;
import com.dmg.spring.Printfx.service.CompanyService;

@CrossOrigin("http://localhost:4200")
@RestController
@RequestMapping("/api/customers")
public class CompanyController {

    @Autowired
    CompanyService companyService;

    // ✅ EXISTING — Get all companies → Admin Dashboard grid
    @GetMapping("/company")
    public List<Company> getAllCompanies() {
        return companyService.getAllCompanies();
    }

    // ✅ NEW — Get single company by ID → Product Dashboard header
    // URL: GET /api/customers/company/1
    @GetMapping("/company/{id}")
    public ResponseEntity<Company> getCompanyById(@PathVariable Long id) {
        return companyService.getCompanyById(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    // ✅ EXISTING — Add company via JSON body
    @PostMapping
    public ResponseEntity<Company> addCompany(@RequestBody Company company) {
        Company savedCompany = companyService.saveCompany(company);
        return new ResponseEntity<>(savedCompany, HttpStatus.CREATED);
    }

    // ✅ EXISTING — Upload company with image file (multipart)
    @PostMapping("/companies")
    public ResponseEntity<?> uploadCompany(
            @RequestParam("name") String name,
            @RequestParam("image") MultipartFile imageFile) throws IOException {

        String uploadDir = "D:/DMG-NEW/Backend/Printfx/src/main/resources/static/images/";
        String filename = imageFile.getOriginalFilename();
        Path path = Paths.get(uploadDir + filename);
        Files.createDirectories(path.getParent());
        Files.copy(imageFile.getInputStream(), path, StandardCopyOption.REPLACE_EXISTING);
        System.out.println("File saved at: " + path.toAbsolutePath());

        String imageUrl = "http://localhost:8080/images/" + filename;
        Company company = new Company();
        company.setName(name);
        company.setImageUrl(imageUrl);
        companyService.saveCompany(company);

        return ResponseEntity.ok(Map.of("name", name, "imageUrl", imageUrl));
    }

    // ✅ NEW — Delete company by ID
    // URL: DELETE /api/customers/company/1
    @DeleteMapping("/company/{id}")
    public ResponseEntity<Void> deleteCompany(@PathVariable Long id) {
        companyService.deleteCompany(id);
        return ResponseEntity.noContent().build();
    }
} 