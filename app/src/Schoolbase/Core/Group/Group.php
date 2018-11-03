<?php
/**
 * A project created by Jitsedev.be
 *
 * Author: Jitse Taels <jitse@jitsedev.be>
 * Date: 31/10/18 17:54
 */

namespace Schoolbase\Core\Group;


use Schoolbase\Core\DB\DB;

class Group
{

    public static function getAll(){

        $db = DB::getInstance();

        $query = $db->query('SELECT * FROM _groups');

        return $query->getResults();

    }

    public static function getByID($id){

        $db = DB::getInstance();

        $query = $db->query('SELECT * FROM _groups WHERE id=?',[$id]);

        return $query->getFirstResult();

    }

    public function hasChild($id){

        $db = DB::getInstance();

        $query = $db->query('SELECT id,parentID FROM _groups WHERE parentID=?', [$id]);

        return $query->getRowCount() > 0 ? true : false;

    }

    public static function getByParentID($parentID){

        $db = DB::getInstance();

        $query = $db->query('SELECT * FROM _groups WHERE parentID=?', [$parentID]);

        return $query->getResults();

    }

    public static function buildTree(){

        $db = DB::getInstance();

        $data = Group::getAll();

        $groups = [];

        foreach ($data as $group){

            $groups[$group->name] = [

                'id' => $group->id,
                'name' => $group->name,
                'description' => $group->description,
                'icon' => $group->icon,
                'type' => (int)$group->type,
                'isChild' => (bool)$group->is_child,
                'children' => []

            ];

            $subGroups = Group::getByParentID($group->id);

            foreach($subGroups as $sgroup) {

                array_push($groups[$group->name]["children"], $sgroup->name);

            }

        }

        return $groups;

    }

    public static function loadGroupMembers($groupID){

        $db = DB::getInstance();

        $db->query('SELECT * FROM _user_groups as ug RIGHT JOIN _user_accounts as ac ON ac.id=ug.userID WHERE ug.groupID=?', [$groupID]);

        $data = $db->getResults();

        $accounts = [];

        foreach ($data as $account){

            $accountArr = [

                'id' => $account->id,
                'username' => $account->username,
                'lastlogin' => date('d/m/y G:i',$account->lastLogin),

            ];

            array_push($accounts, $accountArr);

        }

        return $accounts;

    }

}