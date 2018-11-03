<?php
namespace Schoolbase\Core\User\Auth;
use Symfony\Component\HttpFoundation\Session\Session;

/**
 * A project created by Jitsedev.be
 *
 * Author: Jitse Taels <jitse@jitsedev.be>
 * Date: 28/10/18 12:38
 */

class Login
{

    private static $instance;
    private $username;
    private $password;
    private $errors = false;
    private $db;

    private function __construct()
    {

        $this->db = \Schoolbase\Core\DB\DB::getInstance();

    }

    public function fill($username, $password){

        $this->username = $username;
        $this->password = $password;

    }

    public function run(){

        $query = $this->db->query('SELECT id,username,password,role,forcedPasswordChange FROM _user_accounts WHERE username=?', [$this->username]);

        if($query->getRowCount() > 0){

            $data = $query->getFirstResult();

            if(password_verify($this->password,$data->password)){

                $this->updateLogin($data->id);
                $this->logAccountAccess($data->id);

                $_SESSION['user'] = [

                    'id' => $data->id,
                    'username' => $data->username,
                    'role' => (int) $data->role,
                    'forcedPasswordChange' => (bool) $data->forcedPasswordChange

                ];

            }else {

                $this->errors = true;

            }

        }else
            $this->errors = true;

        return $this->errors == true ? false : true ;

    }

    public function updateLogin($id){

        $this->db->query('UPDATE _user_accounts SET lastLogin=? WHERE id=?',[time(),$id]);

    }

    public function logAccountAccess($id){

        $this->db->insert('_user_login_logs',['userID' => $id,'ip' => $_SERVER['REMOTE_ADDR'], 'userAgent' => $_SERVER['HTTP_USER_AGENT'], 'time' => time()]);

    }

    public static function getInstance(){

        if(self::$instance == null)
            self::$instance = new Login();

        return self::$instance;

    }

}