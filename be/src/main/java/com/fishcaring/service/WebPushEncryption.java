package com.fishcaring.service;

import java.io.ByteArrayOutputStream;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.KeyPair;
import java.security.SecureRandom;
import java.security.interfaces.ECPrivateKey;
import java.security.interfaces.ECPublicKey;
import javax.crypto.Cipher;
import javax.crypto.KeyAgreement;
import javax.crypto.Mac;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import lombok.AccessLevel;
import lombok.NoArgsConstructor;

/**
 * Web Push message encryption: RFC 8291 with the {@code aes128gcm} content coding of RFC 8188. The
 * body is one record: header (salt, record size, sender public key) then the encrypted payload.
 */
@NoArgsConstructor(access = AccessLevel.PRIVATE)
public final class WebPushEncryption {

    /** Push services accept at most 4096 bytes; the header takes 86, the delimiter 1 and the tag 16. */
    public static final int MAX_PAYLOAD_BYTES = 4096 - 86 - 1 - 16;
    public static final int AUTH_SECRET_BYTES = 16;
    private static final int SALT_BYTES = 16;
    private static final int RECORD_SIZE = 4096;
    private static final byte DELIMITER_LAST_RECORD = 0x02;
    private static final SecureRandom RANDOM = new SecureRandom();

    /** Encrypts with a fresh random salt and sender key. */
    public static byte[] encrypt(byte[] payload, byte[] uaPublic, byte[] authSecret) {
        byte[] salt = new byte[SALT_BYTES];
        RANDOM.nextBytes(salt);
        return encrypt(payload, uaPublic, authSecret, salt, EcKeys.generate());
    }

    /** Deterministic form (the salt and the sender key are given), used by the tests with the RFC example. */
    public static byte[] encrypt(byte[] payload, byte[] uaPublic, byte[] authSecret, byte[] salt, KeyPair sender) {
        if (payload.length > MAX_PAYLOAD_BYTES) {
            throw new IllegalArgumentException("The push payload is too long: " + payload.length + " bytes");
        }
        if (authSecret.length != AUTH_SECRET_BYTES || salt.length != SALT_BYTES) {
            throw new IllegalArgumentException("Wrong auth secret or salt length");
        }
        try {
            byte[] asPublic = EcKeys.toUncompressed((ECPublicKey) sender.getPublic());
            byte[] ecdhSecret = ecdh((ECPrivateKey) sender.getPrivate(), EcKeys.publicKey(uaPublic));

            byte[] prkKey = hkdfExtract(authSecret, ecdhSecret);
            byte[] keyInfo = concat("WebPush: info\0".getBytes(StandardCharsets.US_ASCII), uaPublic, asPublic);
            byte[] ikm = hkdfExpand(prkKey, keyInfo, 32);

            byte[] prk = hkdfExtract(salt, ikm);
            byte[] cek = hkdfExpand(prk, "Content-Encoding: aes128gcm\0".getBytes(StandardCharsets.US_ASCII), 16);
            byte[] nonce = hkdfExpand(prk, "Content-Encoding: nonce\0".getBytes(StandardCharsets.US_ASCII), 12);

            byte[] padded = concat(payload, new byte[] {DELIMITER_LAST_RECORD});
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, new SecretKeySpec(cek, "AES"), new GCMParameterSpec(128, nonce));
            byte[] ciphertext = cipher.doFinal(padded);

            ByteBuffer header = ByteBuffer.allocate(SALT_BYTES + 4 + 1 + asPublic.length);
            header.put(salt).putInt(RECORD_SIZE).put((byte) asPublic.length).put(asPublic);
            return concat(header.array(), ciphertext);
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("Cannot encrypt the push message", e);
        }
    }

    private static byte[] ecdh(ECPrivateKey privateKey, ECPublicKey publicKey) throws GeneralSecurityException {
        KeyAgreement agreement = KeyAgreement.getInstance("ECDH");
        agreement.init(privateKey);
        agreement.doPhase(publicKey, true);
        return agreement.generateSecret();
    }

    /** HKDF-Extract (RFC 5869): HMAC-SHA256 keyed with the salt over the input keying material. */
    static byte[] hkdfExtract(byte[] salt, byte[] ikm) throws GeneralSecurityException {
        return hmac(salt, ikm);
    }

    /** HKDF-Expand for at most 32 bytes: a single HMAC block (info followed by the counter byte 1). */
    static byte[] hkdfExpand(byte[] prk, byte[] info, int length) throws GeneralSecurityException {
        byte[] block = hmac(prk, concat(info, new byte[] {0x01}));
        byte[] result = new byte[length];
        System.arraycopy(block, 0, result, 0, length);
        return result;
    }

    private static byte[] hmac(byte[] key, byte[] data) throws GeneralSecurityException {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(key, "HmacSHA256"));
        return mac.doFinal(data);
    }

    private static byte[] concat(byte[]... parts) {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        for (byte[] part : parts) {
            out.writeBytes(part);
        }
        return out.toByteArray();
    }
}
