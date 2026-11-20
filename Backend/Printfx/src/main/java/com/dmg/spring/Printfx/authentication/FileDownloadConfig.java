package com.dmg.spring.Printfx.authentication;

import java.io.IOException;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;

import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * Files under /files/** (maps, guides, letterhead...) are product downloads.
 * Browsers ignore the link's "download" attribute when the website and the API
 * are on different hosts, so the API itself says "save this file" instead of
 * letting the browser open it in a tab.
 */
@Configuration
public class FileDownloadConfig {

    @Bean
    public FilterRegistrationBean<OncePerRequestFilter> fileDownloadFilter() {
        OncePerRequestFilter filter = new OncePerRequestFilter() {
            @Override
            protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                            FilterChain chain) throws ServletException, IOException {
                String path = request.getRequestURI();
                String name = URLDecoder.decode(path.substring(path.lastIndexOf('/') + 1), StandardCharsets.UTF_8);
                if (!name.isBlank()) {
                    boolean plain = name.chars().allMatch(c -> c >= 32 && c < 127);
                    ContentDisposition disposition = plain
                            ? ContentDisposition.attachment().filename(name).build()
                            : ContentDisposition.attachment().filename(name, StandardCharsets.UTF_8).build();
                    response.setHeader(HttpHeaders.CONTENT_DISPOSITION, disposition.toString());
                }
                chain.doFilter(request, response);
            }
        };
        FilterRegistrationBean<OncePerRequestFilter> registration = new FilterRegistrationBean<>(filter);
        registration.addUrlPatterns("/files/*");
        return registration;
    }
}
