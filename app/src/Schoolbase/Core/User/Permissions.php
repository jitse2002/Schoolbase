<?php
/**
 * A project created by Jitsedev.be
 *
 * Author: Jitse Taels <jitse@jitsedev.be>
 * Date: 31/10/18 17:20
 */

namespace Schoolbase\Core\User;


use Schoolbase\Core\DB\DB;

class Permissions
{

    private $userID;
    private $db;

    public function __construct($userID)
    {

        $this->db = DB::getInstance();
        $this->userID = $userID;

    }

    public function has($module,$action){

        $user = new user();

        //Als de gebruiker een admin is heeft hij toegang tot alles!!
        if($user->isAdmin()) {

            return true;

        }

        $query = $this->db->query('SELECT * FROM _user_groups as ug RIGHT JOIN _group_permissions as gp ON gp.id=ug.groupID WHERE ug.userID=? AND gp.module=? AND gp.action=?',[$this->userID,$module,$action]);

        return $query->getRowCount() > 0 ? true : false;

    }

}