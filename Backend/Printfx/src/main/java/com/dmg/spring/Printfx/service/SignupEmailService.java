package com.dmg.spring.Printfx.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import com.dmg.spring.Printfx.model.Users;

/**
 * Emails for the signup approval flow.
 * A failed email never breaks signup or approval; it is only logged.
 */
@Service
public class SignupEmailService {

	private static final Logger log = LoggerFactory.getLogger(SignupEmailService.class);

	private final JavaMailSender mailSender;

	@Value("${dmg.approval-email}")
	private String approvalEmail;

	@Value("${spring.mail.username:}")
	private String fromAddress;

	@Value("${app.frontend-url:http://localhost:4200}")
	private String frontendUrl;

	public SignupEmailService(JavaMailSender mailSender) {
		this.mailSender = mailSender;
	}

	public void notifyAdminOfSignup(Users user) {
		send(approvalEmail,
			"New Marketing Materials Hub signup: " + user.getFullName(),
			"A new user has signed up and is waiting for approval.\n\n"
				+ "Name:  " + user.getFullName() + "\n"
				+ "Email: " + user.getUsername() + "\n\n"
				+ "Log in to review pending signups:\n" + frontendUrl + "\n");
	}

	public void notifyUserApproved(Users user) {
		send(user.getUsername(),
			"Your Marketing Materials Hub account is approved",
			"Hi " + user.getFullName() + ",\n\n"
				+ "Your account has been approved. You can now log in here:\n"
				+ frontendUrl + "\n\n"
				+ "Thank you,\nHolden Conner Marketing");
	}

	public void notifyUserRejected(Users user) {
		send(user.getUsername(),
			"Your Marketing Materials Hub signup",
			"Hi " + user.getFullName() + ",\n\n"
				+ "Your signup request was not approved. If you think this is a mistake, "
				+ "please contact the marketing team.\n\n"
				+ "Thank you,\nHolden Conner Marketing");
	}

	private void send(String to, String subject, String body) {
		try {
			SimpleMailMessage message = new SimpleMailMessage();
			if (fromAddress != null && !fromAddress.isBlank()) {
				message.setFrom(fromAddress);
			}
			message.setTo(to);
			message.setSubject(subject);
			message.setText(body);
			mailSender.send(message);
		} catch (Exception e) {
			log.warn("Could not send email '{}' to {}: {}", subject, to, e.getMessage());
		}
	}
}