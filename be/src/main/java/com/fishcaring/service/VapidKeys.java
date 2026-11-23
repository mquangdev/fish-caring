package com.fishcaring.service;

import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.KeyPair;
import java.security.Signature;
import java.security.interfaces.ECPrivateKey;
import java.security.interfaces.ECPublicKey;
import java.util.Arrays;
import java.util.Base64;

/**
 * The VAPID key pair of the server (RFC 8292). The public key is the raw 65-byte P-256 point and the
 * private key the 32-byte scalar, both written as unpadded base64url like the Web Push tools do.
 */
public record VapidKeys(byte[] publicKeyBytes, ECPrivateKey privateKey) {

    private static final Base64.Encoder ENCODER = Base64.getUrlEncoder().withoutPadding();
    private static final Base64.Decoder DECODER = Base64.getUrlDecoder();

    /** Reads and checks a key pair; fails when a key is malformed or the two keys do not belong together. */
    public static VapidKeys parse(String publicKey, String privateKey) {
        try {
            byte[] publicBytes = DECODER.decode(publicKey.trim());
            ECPublicKey ecPublic = EcKeys.publicKey(publicBytes);
            ECPrivateKey ecPrivate = EcKeys.privateKey(DECODER.decode(privateKey.trim()));
            if (!belongTogether(ecPublic, ecPrivate)) {
                throw new IllegalStateException("VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY are not a pair.");
            }
            return new VapidKeys(publicBytes, ecPrivate);
        } catch (IllegalArgumentException e) {
            throw new IllegalStateException("VAPID keys are invalid: " + e.getMessage(), e);
        }
    }

    /** A new pair as {public, private} base64url strings. */
    public static String[] generate() {
        KeyPair pair = EcKeys.generate();
        return new String[] {
            ENCODER.encodeToString(EcKeys.toUncompressed((ECPublicKey) pair.getPublic())),
            ENCODER.encodeToString(EcKeys.toScalar((ECPrivateKey) pair.getPrivate()))
        };
    }

    public String publicKeyBase64Url() {
        return ENCODER.encodeToString(publicKeyBytes);
    }

    /** Signs a probe with the private key and verifies it with the public key. */
    private static boolean belongTogether(ECPublicKey publicKey, ECPrivateKey privateKey) {
        try {
            byte[] probe = "vapid-key-check".getBytes(StandardCharsets.US_ASCII);
            Signature signer = Signature.getInstance("SHA256withECDSA");
            signer.initSign(privateKey);
            signer.update(probe);
            byte[] signature = signer.sign();
            Signature verifier = Signature.getInstance("SHA256withECDSA");
            verifier.initVerify(publicKey);
            verifier.update(probe);
            return verifier.verify(signature);
        } catch (GeneralSecurityException e) {
            return false;
        }
    }

    @Override
    public boolean equals(Object other) {
        return other instanceof VapidKeys keys
                && Arrays.equals(publicKeyBytes, keys.publicKeyBytes)
                && privateKey.equals(keys.privateKey);
    }

    @Override
    public int hashCode() {
        return 31 * Arrays.hashCode(publicKeyBytes) + privateKey.hashCode();
    }

    /** Never prints the private key. */
    @Override
    public String toString() {
        return "VapidKeys[public=" + publicKeyBase64Url() + ", private=hidden]";
    }
}
