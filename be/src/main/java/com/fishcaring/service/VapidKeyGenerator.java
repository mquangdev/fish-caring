package com.fishcaring.service;

/**
 * Prints a new VAPID key pair for the VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY environment variables:
 * {@code java -cp target/classes com.fishcaring.service.VapidKeyGenerator}.
 */
public final class VapidKeyGenerator {

    private VapidKeyGenerator() {
    }

    public static void main(String[] args) {
        String[] pair = VapidKeys.generate();
        System.out.println("VAPID_PUBLIC_KEY=" + pair[0]);
        System.out.println("VAPID_PRIVATE_KEY=" + pair[1]);
        System.out.println("VAPID_SUBJECT=mailto:you@example.com");
    }
}
