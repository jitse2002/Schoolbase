<?php
/**
 * A project created by Jitsedev.be
 *
 * Author: Jitse Taels <jitse@jitsedev.be>
 * Date: 23/10/18 18:13
 */

namespace Schoolbase\Core\User;


use Schoolbase\Core\DB\DB;
use Schoolbase\Core\User\Auth\Login;

class User
{

    private $authenticated = false;
    private $uuid;
    private $debugUser = false;
    private $teacher = false;
    private $DB;

    public function __construct()
    {

        if(isset($_SESSION['user'])) {

            $this->authenticated = true;

        }

        $this->DB = DB::getInstance();

    }

    public function isGuest(){

        return $this->authenticated == false ? true : false;

    }

    public function getCurrentUser(){}

    public function getUserByID($userID){

        $query = $this->DB->query('SELECT * FROM _user_accounts WHERE id=?',[$userID]);

        return $query->getFirstResult();

    }

    public function userExists($userID){

        $query = $this->DB->query('SELECT id FROM _user_accounts WHERE id=?',[$userID]);

        return $query->getRowCount() > 0 ? true : false;

    }

    public function login(){

        return Login::getInstance();

    }

    public function isAdmin(){

        if(!isset($_SESSION['user'])) {

            return false;

        }

        if($_SESSION['user']['role'] == 100) {

            return true;

        } else {

            return false;

        }

    }

    public function permissions(){

        return new Permissions($_SESSION['user']['id']);

    }

}