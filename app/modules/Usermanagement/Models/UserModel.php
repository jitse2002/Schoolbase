<?php
/**
 * A project created by Jitsedev.be
 *
 * Author: Jitse Taels <jitse@jitsedev.be>
 * Date: 2/11/18 13:07
 */

namespace Schoolbase\Module\Usermanagement\Models;


use Schoolbase\Core\DB\DB;
use Schoolbase\Core\Mapper\VarMapper;

class UserModel
{

    public static function create(VarMapper $vars){

        $db = DB::getInstance();

        $db->insert('_user_accounts',$vars->getVarMap());

    }

    public static function updateFieldByID($userID,$field,$fieldValue){

        $db = DB::getInstance();

        $db->query("UPDATE _user_accounts SET {$field}=? WHERE id=?",[$fieldValue,$userID]);

    }

    public static function usernameExists($username){

        $db = DB::getInstance();

        $query = $db->query('SELECT username FROM _user_accounts WHERE username=?',[$username]);

        return $query->getRowCount() > 0 ? true : false;

    }

    public static function setUserInGroup($userID,$groupID){

        $db = DB::getInstance();

        $db->insert('_user_groups',['userID'=>$userID, 'groupID' => $groupID]);

    }

}