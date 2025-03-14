package com.dmg.spring.Printfx.controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.dmg.spring.Printfx.model.Company;
import com.dmg.spring.Printfx.service.CompanyService;

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

}
