package com.dmg.spring.Printfx.service;

import java.util.HashMap;
import java.util.Map;
import java.util.Random;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;


@Service
public class OTPService {
	
	@Autowired
	private JavaMailSender mailSender;
	
    private Map<String, String> otpStorage = new HashMap<>();

    public String generateOTP(String email) {
        String otp = String.valueOf(new Random().nextInt(900000) + 100000); // 6-digit OTP
        otpStorage.put(email, otp);
        return otp;
    }

    public boolean verifyOTP(String email, String enteredOTP) {
        return otpStorage.containsKey(email) && otpStorage.get(email).equals(enteredOTP);
    }

    public void clearOTP(String email) {
        otpStorage.remove(email);
    }
    
    public void sendOtpEmail(String to, String otp) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(to);
            message.setSubject("Password Reset OTP");
            message.setText("Your OTP for password reset is: " + otp);
            mailSender.send(message);
            System.out.println("OTP email sent successfully!");
        } catch (Exception e) {
            System.out.println("Failed to send email: " + e.getMessage());
        }
    }
}