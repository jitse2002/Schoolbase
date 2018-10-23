<?php
/**
 * A project created by Jitsedev.be
 *
 * Author: Jitse Taels <jitse@jitsedev.be>
 * Date: 23/10/18 18:13
 */

namespace Schoolbase\Core\User;


class User
{

    private $authenticated = false;
    private $uuid;
    private $debugUser = false;
    private $teacher = false;

    public function __construct()
    {

        if(isset($_SESSION['user']))
            return true;

    }

    public function isGuest(){

        return $this->authenticated == false ? true : false;

    }

    public function getCurrentUser(){}

}