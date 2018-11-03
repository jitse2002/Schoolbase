<?php
/**
 * A project created by Jitsedev.be
 *
 * Author: Jitse Taels <jitse@jitsedev.be>
 * Date: 2/11/18 12:15
 */

namespace Schoolbase\Core\Util;


class Request
{

    const TYPE_POST = 1;
    const TYPE_GET = 2;

    const TYPE_STRING = 1;
    const TYPE_INT = 2;
    const TYPE_BOOL = 3;
    const TYPE_DOUBLE = 4;
    const TYPE_FLOAT = 5;

    public static function getRequestVar($key,$requestType,$stringType){

        //Check if the request type is post or get request
        if($requestType == 1){

            if(isset($_POST[$key])) {

                return Filter::filterStringType($stringType,$_POST[$key]);

            }else {

                return null;

            }

        }elseif($requestType == 2){

            if(isset($_GET[$key])) {

                return Filter::filterStringType($stringType,$_GET[$key]);

            }else {

                return null;

            }

        }

        return null; //Return null if the requesttype don't exists

    }

}