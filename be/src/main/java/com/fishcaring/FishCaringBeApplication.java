package com.fishcaring;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class FishCaringBeApplication {

	public static void main(String[] args) {
		SpringApplication.run(FishCaringBeApplication.class, args);
	}

}
