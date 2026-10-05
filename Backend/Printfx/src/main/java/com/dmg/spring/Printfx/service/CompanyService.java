package com.dmg.spring.Printfx.service;

import java.util.List;
import java.util.Optional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import com.dmg.spring.Printfx.model.Company;
import com.dmg.spring.Printfx.repository.CompanyRepository;

@Service
public class CompanyService {

    @Autowired
    private CompanyRepository companyRepository;

    // ✅ Already had this — get all companies for Admin Dashboard
    public List<Company> getAllCompanies() {
        return companyRepository.findAll();
    }

    // ✅ Already had this — save/add new company
    public Company saveCompany(Company company) {
        return companyRepository.save(company);
    }

    // ✅ NEW — get one company by ID (needed for Product Dashboard header)
    public Optional<Company> getCompanyById(Long id) {
        return companyRepository.findById(id);
    }

    // ✅ NEW — delete company by ID (needed for admin actions)
    public void deleteCompany(Long id) {
        companyRepository.deleteById(id);
    }
}