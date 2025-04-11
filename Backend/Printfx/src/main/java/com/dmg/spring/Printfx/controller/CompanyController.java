package com.dmg.spring.Printfx.controller;

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
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.dmg.spring.Printfx.model.Company;
import com.dmg.spring.Printfx.service.CompanyService;

import io.jsonwebtoken.io.IOException;

@CrossOrigin("http://localhost:4200")
@RestController
@RequestMapping("/api/customers")
public class CompanyController {
	
	@Autowired
	CompanyService companyService;
	
	@GetMapping("/company")
    public List<Company> getAllCompanies() {
        return companyService.getAllCompanies();
    }
	
	@PostMapping
    public ResponseEntity<Company> addCompany(@RequestBody Company company) {
        Company savedCompany = companyService.saveCompany(company);
        return new ResponseEntity<>(savedCompany, HttpStatus.CREATED);
    }
	
	@PostMapping("/companies")
	public ResponseEntity<?> uploadCompany(
	        @RequestParam("name") String name,
	        @RequestParam("image") MultipartFile imageFile) throws IOException, java.io.IOException {

	    String folder = "src/main/resources/static";
	    String filename = imageFile.getOriginalFilename();
	    System.out.println("imageupload"+ filename);
	    Path path = Paths.get(folder + filename);
	    Files.copy(imageFile.getInputStream(), path, StandardCopyOption.REPLACE_EXISTING);

	    String imageUrl = "assets/images/" + filename;
	    
	    Company company = new Company();
	    company.setName(name);
	    company.setImageUrl("assets/images/" +filename); 

	    companyService.saveCompany(company);
	    return ResponseEntity.ok(Map.of("name", name, "imageUrl", imageUrl));
	}


}
