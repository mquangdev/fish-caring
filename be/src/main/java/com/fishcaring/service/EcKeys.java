package com.fishcaring.service;

import java.math.BigInteger;
import java.security.AlgorithmParameters;
import java.security.GeneralSecurityException;
import java.security.KeyFactory;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.interfaces.ECPrivateKey;
import java.security.interfaces.ECPublicKey;
import java.security.spec.ECGenParameterSpec;
import java.security.spec.ECParameterSpec;
import java.security.spec.ECPoint;
import java.security.spec.ECPrivateKeySpec;
import java.security.spec.ECPublicKeySpec;
import java.security.spec.InvalidKeySpecException;
import java.util.Arrays;
import lombok.AccessLevel;
import lombok.NoArgsConstructor;

/** P-256 key helpers for Web Push: raw 65-byte public points (0x04 X Y) and 32-byte private scalars. */
@NoArgsConstructor(access = AccessLevel.PRIVATE)
public final class EcKeys {

    public static final int PUBLIC_KEY_BYTES = 65;
    public static final int PRIVATE_KEY_BYTES = 32;
    private static final int COORDINATE_BYTES = 32;

    private static final ECParameterSpec P256 = loadCurve();

    private static ECParameterSpec loadCurve() {
        try {
            AlgorithmParameters parameters = AlgorithmParameters.getInstance("EC");
            parameters.init(new ECGenParameterSpec("secp256r1"));
            return parameters.getParameterSpec(ECParameterSpec.class);
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("The JDK has no P-256 curve", e);
        }
    }

    public static KeyPair generate() {
        try {
            KeyPairGenerator generator = KeyPairGenerator.getInstance("EC");
            generator.initialize(new ECGenParameterSpec("secp256r1"));
            return generator.generateKeyPair();
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("Cannot generate a P-256 key pair", e);
        }
    }

    /** The uncompressed point of a public key: 0x04, X (32 bytes), Y (32 bytes). */
    public static byte[] toUncompressed(ECPublicKey key) {
        byte[] result = new byte[PUBLIC_KEY_BYTES];
        result[0] = 0x04;
        copyFixed(key.getW().getAffineX(), result, 1);
        copyFixed(key.getW().getAffineY(), result, 1 + COORDINATE_BYTES);
        return result;
    }

    /** The private scalar as exactly 32 bytes. */
    public static byte[] toScalar(ECPrivateKey key) {
        byte[] result = new byte[PRIVATE_KEY_BYTES];
        copyFixed(key.getS(), result, 0);
        return result;
    }

    /** Reads an uncompressed point; fails when it is not 65 bytes starting with 0x04 or not on the curve. */
    public static ECPublicKey publicKey(byte[] uncompressed) {
        if (uncompressed == null || uncompressed.length != PUBLIC_KEY_BYTES || uncompressed[0] != 0x04) {
            throw new IllegalArgumentException("A P-256 public key is 65 bytes starting with 0x04");
        }
        BigInteger x = new BigInteger(1, Arrays.copyOfRange(uncompressed, 1, 1 + COORDINATE_BYTES));
        BigInteger y = new BigInteger(1, Arrays.copyOfRange(uncompressed, 1 + COORDINATE_BYTES, PUBLIC_KEY_BYTES));
        try {
            return (ECPublicKey) KeyFactory.getInstance("EC")
                    .generatePublic(new ECPublicKeySpec(new ECPoint(x, y), P256));
        } catch (InvalidKeySpecException e) {
            throw new IllegalArgumentException("The point is not on the P-256 curve", e);
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException(e);
        }
    }

    public static ECPrivateKey privateKey(byte[] scalar) {
        if (scalar == null || scalar.length != PRIVATE_KEY_BYTES) {
            throw new IllegalArgumentException("A P-256 private key is 32 bytes");
        }
        try {
            return (ECPrivateKey) KeyFactory.getInstance("EC")
                    .generatePrivate(new ECPrivateKeySpec(new BigInteger(1, scalar), P256));
        } catch (GeneralSecurityException e) {
            throw new IllegalArgumentException("Invalid P-256 private key", e);
        }
    }

    private static void copyFixed(BigInteger value, byte[] target, int offset) {
        byte[] bytes = value.toByteArray();
        int start = bytes.length > COORDINATE_BYTES ? bytes.length - COORDINATE_BYTES : 0;
        int length = bytes.length - start;
        System.arraycopy(bytes, start, target, offset + COORDINATE_BYTES - length, length);
    }
}
