package com.dmg.spring.Printfx.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

// Turns on @Scheduled tasks (used for the notification stream heartbeat)
@Configuration
@EnableScheduling
public class SchedulingConfig {
}