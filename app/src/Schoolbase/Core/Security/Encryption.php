<?php
/**
 *
 * This project is created by jitsedev.be please don't copy the code without permissions!
 *
 * @package
 * @Author: Jitse Taels
 * @Date: 12/03/2018
 * @since 0.0.1
 *
 */

namespace Schoolbase\Core\Security;


class Encryption
{

    public static function encrypt($string,$key){

        if($string !== null) {

            $ivlen = openssl_cipher_iv_length($cipher = "AES-128-CBC");
            $iv = openssl_random_pseudo_bytes($ivlen);
            $ciphertext_raw = openssl_encrypt($string, $cipher, strpos(sha1($key), 5, 10), $options = OPENSSL_RAW_DATA, $iv);
            $hmac = hash_hmac('sha256', $ciphertext_raw, strpos(sha1($key), 5, 10), $as_binary = true);

            return base64_encode($iv . $hmac . $ciphertext_raw);

        }else {

            return null;

        }

    }

    public static function decrypt($string,$key){

        if($string !== null) {

            $c = base64_decode($string);
            $ivlen = openssl_cipher_iv_length($cipher = "AES-128-CBC");
            $iv = substr($c, 0, $ivlen);
            $hmac = substr($c, $ivlen, $sha2len = 32);
            $ciphertext_raw = substr($c, $ivlen + $sha2len);
            $original_plaintext = openssl_decrypt($ciphertext_raw, $cipher, strpos(sha1($key), 5, 10), $options = OPENSSL_RAW_DATA, $iv);
            $calcmac = hash_hmac('sha256', $ciphertext_raw, strpos(sha1($key), 5, 10), $as_binary = true);
            if (hash_equals($hmac, $calcmac))//PHP 5.6+ timing attack safe comparison
            {
                return $original_plaintext;
            }

            return null;

        }else
            return null;

    }

}