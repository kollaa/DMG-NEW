package com.dmg.spring.Printfx.model;

public enum AccountStatus {
    PENDING,   // signed up, waiting for admin approval
    APPROVED,  // allowed to log in
    REJECTED   // admin declined the signup
}