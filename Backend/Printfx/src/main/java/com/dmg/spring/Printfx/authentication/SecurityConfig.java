package com.dmg.spring.Printfx.authentication;

import java.util.function.Supplier;

import jakarta.servlet.DispatcherType;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authorization.AuthorizationDecision;
import org.springframework.security.authorization.AuthorizationManager;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.intercept.RequestAuthorizationContext;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import com.dmg.spring.Printfx.service.UserService;

@Configuration
public class SecurityConfig {

    // Company and product endpoints: anyone may READ them (GET),
    // but only admins may create / change / delete (POST, PUT, PATCH, DELETE).
    private static final String[] COMPANY_PRODUCT_PATHS = {
        "/api/customers/company",
        "/api/customers/company/**",
        "/api/customers/companies",
        "/api/companies/**"
    };

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final UserService userService;

    public SecurityConfig(JwtAuthenticationFilter jwtAuthenticationFilter, UserService userService) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
        this.userService = userService;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http.csrf(csrf -> csrf.disable())
            .cors(Customizer.withDefaults())
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()

                // Live notification stream: the request is already checked when it
                // starts; these internal follow-up dispatches must not be re-blocked.
                .dispatcherTypeMatchers(DispatcherType.ASYNC, DispatcherType.ERROR).permitAll()

                // Admin only: adding / editing / deleting companies and products
                .requestMatchers(HttpMethod.POST, COMPANY_PRODUCT_PATHS).access(adminOnly())
                .requestMatchers(HttpMethod.PUT, COMPANY_PRODUCT_PATHS).access(adminOnly())
                .requestMatchers(HttpMethod.PATCH, COMPANY_PRODUCT_PATHS).access(adminOnly())
                .requestMatchers(HttpMethod.DELETE, COMPANY_PRODUCT_PATHS).access(adminOnly())

                // Public read-only company / product data
                .requestMatchers(HttpMethod.GET, COMPANY_PRODUCT_PATHS).permitAll()

                // Public auth pages, images, and Spring's error page
                .requestMatchers(
                    "/error",
                    "/api/customers/login",
                    "/api/customers/signup",
                    "/authentication",
                    "/api/customers/forgot-password",
                    "/api/customers/password-reset",
                    "/api/customers/verify-otp",
                    "/images/**",
                    "/assets/**"
                ).permitAll()

                .anyRequest().authenticated()
            )
            .sessionManagement(session -> session
                .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
            )
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    /** Allows the request only for a logged-in user with the ADMIN role. */
    private AuthorizationManager<RequestAuthorizationContext> adminOnly() {
        return (Supplier<Authentication> authentication, RequestAuthorizationContext context) -> {
            Authentication auth = authentication.get();
            boolean allowed = auth != null
                    && auth.isAuthenticated()
                    && !(auth instanceof AnonymousAuthenticationToken)
                    && userService.isAdmin(auth.getName());
            return new AuthorizationDecision(allowed);
        };
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration authenticationConfiguration) throws Exception {
        return authenticationConfiguration.getAuthenticationManager();
    }

    @Bean
    public WebMvcConfigurer corsConfigurer(
            @Value("${app.cors.allowed-origins}") String[] allowedOrigins) {
        return new WebMvcConfigurer() {
            @Override
            public void addCorsMappings(CorsRegistry registry) {
                registry.addMapping("/**")
                        .allowedOrigins(allowedOrigins)
                        .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE")
                        .allowedHeaders("*")
                        .allowCredentials(true);
            }

            @Override
            public void addResourceHandlers(ResourceHandlerRegistry registry) {
                // Serve images bundled inside the jar (works locally and on Azure)
                registry.addResourceHandler("/images/**")
                        .addResourceLocations("classpath:/static/images/");
            }
        };
    }
}