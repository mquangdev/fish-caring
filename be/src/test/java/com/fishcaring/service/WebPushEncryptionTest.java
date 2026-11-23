package com.fishcaring.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.KeyPair;
import java.security.interfaces.ECPrivateKey;
import java.security.interfaces.ECPublicKey;
import java.util.Arrays;
import java.util.Base64;
import javax.crypto.Cipher;
import javax.crypto.KeyAgreement;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import org.junit.jupiter.api.Test;

/** Message encryption checked against the example of RFC 8291 (section 5 and appendix A). */
class WebPushEncryptionTest {

    private static final Base64.Decoder B64 = Base64.getUrlDecoder();
    private static final Base64.Encoder B64_OUT = Base64.getUrlEncoder().withoutPadding();

    // RFC 8291 appendix A
    private static final String PLAINTEXT = "When I grow up, I want to be a watermelon";
    private static final String AS_PRIVATE = "yfWPiYE-n46HLnH0KqZOF1fJJU3MYrct3AELtAQ-oRw";
    private static final String AS_PUBLIC =
            "BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8";
    private static final String UA_PRIVATE = "q1dXpw3UpT5VOmu_cf_v6ih07Aems3njxI-JWgLcM94";
    private static final String UA_PUBLIC =
            "BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4";
    private static final String AUTH_SECRET = "BTBZMqHH6r4Tts7J_aSIgg";
    private static final String SALT = "DGv6ra1nlYgDCS1FRnbzlw";
    private static final String HEADER =
            "DGv6ra1nlYgDCS1FRnbzlwAAEABBBP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8";
    private static final String CIPHERTEXT =
            "8pfeW0KbunFT06SuDKoJH9Ql87S1QUrdirN6GcG7sFz1y1sqLgVi1VhjVkHsUoEsbI_0LpXMuGvnzQ";

    private static KeyPair keyPair(String publicKey, String privateKey) {
        return new KeyPair(EcKeys.publicKey(B64.decode(publicKey)), EcKeys.privateKey(B64.decode(privateKey)));
    }

    @Test
    void matchesTheExampleOfRfc8291ByteForByte() {
        byte[] body = WebPushEncryption.encrypt(PLAINTEXT.getBytes(StandardCharsets.UTF_8), B64.decode(UA_PUBLIC),
                B64.decode(AUTH_SECRET), B64.decode(SALT), keyPair(AS_PUBLIC, AS_PRIVATE));

        // the RFC prints the header and the ciphertext as two base64url strings; the message is both as bytes
        assertThat(body).isEqualTo(concat(B64.decode(HEADER), B64.decode(CIPHERTEXT)));
        assertThat(body).hasSize(86 + 41 + 1 + 16);
        // the same message as the RFC prints it in section 5 (one base64url string)
        assertThat(B64_OUT.encodeToString(body)).startsWith("DGv6ra1nlYgDCS1FRnbzlwAAEABBBP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27");
    }

    @Test
    void theHeaderHasTheSaltTheRecordSizeAndTheSenderKey() {
        byte[] body = WebPushEncryption.encrypt("x".getBytes(StandardCharsets.UTF_8), B64.decode(UA_PUBLIC),
                B64.decode(AUTH_SECRET));

        ByteBuffer buffer = ByteBuffer.wrap(body);
        buffer.position(16);
        assertThat(buffer.getInt()).isEqualTo(4096);
        assertThat(buffer.get() & 0xff).isEqualTo(65);
        byte[] senderKey = new byte[65];
        buffer.get(senderKey);
        assertThat(senderKey[0]).isEqualTo((byte) 0x04);
        // header 86 bytes, the payload, the delimiter and the 16 byte tag
        assertThat(body).hasSize(86 + 1 + 1 + 16);
    }

    @Test
    void theReceiverCanDecryptWhatWasEncrypted() throws Exception {
        KeyPair receiver = EcKeys.generate();
        byte[] receiverPublic = EcKeys.toUncompressed((ECPublicKey) receiver.getPublic());
        byte[] authSecret = new byte[16];
        new java.security.SecureRandom().nextBytes(authSecret);
        String text = "Bể Mini 30L: sắp đến giờ cho ăn (08:00)";

        byte[] body = WebPushEncryption.encrypt(text.getBytes(StandardCharsets.UTF_8), receiverPublic, authSecret);

        assertThat(decrypt(body, receiver, authSecret)).isEqualTo(text);
    }

    @Test
    void aRandomSaltAndSenderKeyMakeEveryMessageDifferent() {
        byte[] one = WebPushEncryption.encrypt("same".getBytes(StandardCharsets.UTF_8), B64.decode(UA_PUBLIC),
                B64.decode(AUTH_SECRET));
        byte[] two = WebPushEncryption.encrypt("same".getBytes(StandardCharsets.UTF_8), B64.decode(UA_PUBLIC),
                B64.decode(AUTH_SECRET));

        assertThat(one).isNotEqualTo(two);
    }

    @Test
    void aPayloadThatDoesNotFitInOneMessageIsRejected() {
        byte[] biggest = new byte[WebPushEncryption.MAX_PAYLOAD_BYTES];
        byte[] tooBig = new byte[WebPushEncryption.MAX_PAYLOAD_BYTES + 1];

        assertThat(WebPushEncryption.encrypt(biggest, B64.decode(UA_PUBLIC), B64.decode(AUTH_SECRET)).length)
                .isEqualTo(4096);
        assertThatThrownBy(() -> WebPushEncryption.encrypt(tooBig, B64.decode(UA_PUBLIC), B64.decode(AUTH_SECRET)))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void aBadReceiverKeyOrAuthSecretIsRejected() {
        byte[] payload = "x".getBytes(StandardCharsets.UTF_8);

        assertThatThrownBy(() -> WebPushEncryption.encrypt(payload, new byte[65], B64.decode(AUTH_SECRET)))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> WebPushEncryption.encrypt(payload, B64.decode(UA_PUBLIC), new byte[15]))
                .isInstanceOf(IllegalArgumentException.class);
    }

    /** What a browser does with the message (RFC 8291 section 3.4 from the receiver side). */
    private static String decrypt(byte[] body, KeyPair receiver, byte[] authSecret) throws Exception {
        byte[] salt = Arrays.copyOfRange(body, 0, 16);
        byte[] senderPublic = Arrays.copyOfRange(body, 21, 86);
        byte[] ciphertext = Arrays.copyOfRange(body, 86, body.length);

        KeyAgreement agreement = KeyAgreement.getInstance("ECDH");
        agreement.init((ECPrivateKey) receiver.getPrivate());
        agreement.doPhase(EcKeys.publicKey(senderPublic), true);
        byte[] ecdh = agreement.generateSecret();

        byte[] prkKey = WebPushEncryption.hkdfExtract(authSecret, ecdh);
        byte[] keyInfo = concat("WebPush: info\0".getBytes(StandardCharsets.US_ASCII),
                EcKeys.toUncompressed((ECPublicKey) receiver.getPublic()), senderPublic);
        byte[] ikm = WebPushEncryption.hkdfExpand(prkKey, keyInfo, 32);
        byte[] prk = WebPushEncryption.hkdfExtract(salt, ikm);
        byte[] cek = WebPushEncryption.hkdfExpand(prk, "Content-Encoding: aes128gcm\0".getBytes(StandardCharsets.US_ASCII), 16);
        byte[] nonce = WebPushEncryption.hkdfExpand(prk, "Content-Encoding: nonce\0".getBytes(StandardCharsets.US_ASCII), 12);

        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.DECRYPT_MODE, new SecretKeySpec(cek, "AES"), new GCMParameterSpec(128, nonce));
        byte[] padded = cipher.doFinal(ciphertext);
        assertThat(padded[padded.length - 1]).isEqualTo((byte) 0x02);
        return new String(Arrays.copyOf(padded, padded.length - 1), StandardCharsets.UTF_8);
    }

    private static byte[] concat(byte[]... parts) {
        java.io.ByteArrayOutputStream out = new java.io.ByteArrayOutputStream();
        for (byte[] part : parts) {
            out.writeBytes(part);
        }
        return out.toByteArray();
    }
}
