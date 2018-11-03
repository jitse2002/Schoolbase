<?php
/**
 * A project created by Jitsedev.be
 *
 * Author: Jitse Taels <jitse@jitsedev.be>
 * Date: 2/11/18 12:32
 */

namespace Schoolbase\Core\Util;


class Filter
{

    public static function filterStringType(int $stringType, $text) {

        switch ($stringType) {

            case 1:
                return $text;
                break;
            case 2:
                return intval($text);
                break;
            case 3:
                return boolval($text);
                break;
            case 4:
                return doubleval($text);
                break;
            case 5:
                return floatval($text);
                break;

            default:
                return $text;

        }

    }

}