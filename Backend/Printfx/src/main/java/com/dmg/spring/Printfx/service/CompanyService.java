package com.dmg.spring.Printfx.service;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.dmg.spring.Printfx.model.Company;
import com.dmg.spring.Printfx.repository.CompanyRepository;

@Service
public class CompanyService {
	
	@Autowired
    private CompanyRepository companyRepository;

    public List<Company> getAllCompanies() {
        return companyRepository.findAll();
    }

    public Company saveCompany(Company company) {
        return companyRepository.save(company);
    }

}
