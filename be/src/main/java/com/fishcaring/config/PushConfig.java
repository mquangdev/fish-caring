package com.fishcaring.config;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** The executor Web Push messages are sent on, so a slow push service never delays the scheduler. */
@Configuration
public class PushConfig {

    @Bean(name = "pushExecutor")
    public ExecutorService pushExecutor() {
        return Executors.newVirtualThreadPerTaskExecutor();
    }
}
