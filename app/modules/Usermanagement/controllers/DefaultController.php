<?php
/**
 * A project created by Jitsedev.be
 *
 * Author: Jitse Taels <jitse@jitsedev.be>
 * Date: 31/10/18 15:40
 */

class DefaultController extends \Schoolbase\Core\Controller\Controller
{

    public function index(){

        $user = new \Schoolbase\Core\User\User();

        if(!$user->isAdmin()) {
            die('No access!');

        }

        \Schoolbase\Core\Util\Resource::callModuleView('Usermanagement','index');

    }

    public function user(){

        $user = new \Schoolbase\Core\User\User();

        //Rechten controlleren!
        if(!$user->isAdmin()) {

            die('What are we doing?');

        }

        $userID = $this->parameters['userID'];
        $groupID = $this->parameters['groupID'];

        $varMapper = [

            'currentUserID' => $userID,
            'groupID' => $groupID,
            'user' => [

                'id' => $userID,
                'username' => null,
                'email' => null,
                'firstname' => null,
                'lastname' => null,
                'extranames' => null,
                'initialen' => null,
                'phone' => null,
                'fax' => null,
                'street' => null,
                'housenr' => null,
                'postalcode' => null,
                'city' => null,
                'dob' => null,
                'birthplace' => null,
                'birthcountry' => null,
                'forcedPasswordChange' => false,
                'role' => 1

            ]

        ];

        if($userID != 0) {

            $userInfo = $user->getUserByID($userID);

            $varMapper['user']['id'] = $userInfo->id;
            $varMapper['user']['username'] = $userInfo->username;
            $varMapper['user']['email'] = $userInfo->email;
            $varMapper['user']['firstname'] = $userInfo->firstname;
            $varMapper['user']['lastname'] = $userInfo->lastname;
            $varMapper['user']['extranames'] = $userInfo->extranames;
            $varMapper['user']['initialen'] = $userInfo->initialen;
            $varMapper['user']['phone'] = $userInfo->telephone;
            $varMapper['user']['fax'] = $userInfo->fax;
            $varMapper['user']['street'] = $userInfo->street;
            $varMapper['user']['housenr'] = $userInfo->housenr;
            $varMapper['user']['postalcode'] = (int)$userInfo->postalcode;
            $varMapper['user']['city'] = $userInfo->city;
            $varMapper['user']['dob'] = $userInfo->dob;
            $varMapper['user']['birthplace'] = $userInfo->birthplace;
            $varMapper['user']['birthcountry'] = $userInfo->birthCountry;
            $varMapper['user']['forcedPasswordChange'] =(bool) $userInfo->forcedPasswordChange;
            $varMapper['user']['role'] =(int) $userInfo->role;

        }

        \Schoolbase\Core\Util\Resource::callModuleView('Usermanagement','user',$varMapper);

    }

}