<?php
use Schoolbase\Core\Mapper\VarMapper;
use Schoolbase\Core\Module\Module;
use Schoolbase\Core\Util\Request;
use Schoolbase\Module\Usermanagement\Models\UserModel;

/**
 * A project created by Jitsedev.be
 *
 * Author: Jitse Taels <jitse@jitsedev.be>
 * Date: 31/10/18 19:01
 */

class RestController extends \Schoolbase\Core\Controller\RestController
{

    public function group_tree(){

        $user = new \Schoolbase\Core\User\User();

        if(!$user->isAdmin()) {

            Module::logSuspiciousModuleEntry('usermanagement');

            die('NO ACCESS!!!!');

        }

        $groupTree = \Schoolbase\Core\Group\Group::buildTree();

        $this->output($groupTree);

    }

    public function group_listgroupmembers(){

        $user = new \Schoolbase\Core\User\User();

        if(!$user->isAdmin()) {

            Module::logSuspiciousModuleEntry('usermanagement');

            die('NO ACCESS!!!!');

        }

        $this->output(\Schoolbase\Core\Group\Group::loadGroupMembers($this->parameters['groupID']));

    }

    public function edituser(){

        $user = new \Schoolbase\Core\User\User();

        if(!$user->isAdmin()){

            Module::logSuspiciousModuleEntry('usermanagement');

            die('NO ACCESS!!!!');

        }

        $userID     = Request::getRequestVar('userID',Request::TYPE_POST,Request::TYPE_STRING);
        $groupID    = Request::getRequestVar('groupID',Request::TYPE_POST,Request::TYPE_INT);
        $username   = Request::getRequestVar('username',Request::TYPE_POST,Request::TYPE_STRING);
        $password   = Request::getRequestVar('password',Request::TYPE_POST,Request::TYPE_STRING);
        $passwordRepeat   = Request::getRequestVar('passwordRepeat',Request::TYPE_POST,Request::TYPE_STRING);
        $email      = Request::getRequestVar('email',Request::TYPE_POST,Request::TYPE_STRING);
        $firstname  = Request::getRequestVar('firstname',Request::TYPE_POST,Request::TYPE_STRING);
        $lastname   = Request::getRequestVar('lastname',Request::TYPE_POST,Request::TYPE_STRING);
        $extranames = Request::getRequestVar('extranames',Request::TYPE_POST,Request::TYPE_STRING);
        $initialen  = Request::getRequestVar('initialen',Request::TYPE_POST,Request::TYPE_STRING);
        $telephone  = Request::getRequestVar('telephone',Request::TYPE_POST,Request::TYPE_INT);
        $street     = Request::getRequestVar('street',Request::TYPE_POST,Request::TYPE_STRING);
        $housenr    = Request::getRequestVar('housenr',Request::TYPE_POST,Request::TYPE_STRING);
        $postalcode = Request::getRequestVar('postalcode',Request::TYPE_POST,Request::TYPE_INT);
        $city       = Request::getRequestVar('city',Request::TYPE_POST,Request::TYPE_STRING);
        $dob        = Request::getRequestVar('dob',Request::TYPE_POST,Request::TYPE_STRING);
        $birthplace = Request::getRequestVar('birthplace',Request::TYPE_POST,Request::TYPE_STRING);
        $birthcountry = Request::getRequestVar('birthCountry',Request::TYPE_POST,Request::TYPE_STRING);
        $role       = Request::getRequestVar('role',Request::TYPE_POST,Request::TYPE_INT);
        $forcedPasswordChange = Request::getRequestVar('forcedPasswordChange',Request::TYPE_POST,Request::TYPE_INT);

        $errors = [];

        //GroupID is verplicht
        if($groupID === 0){

            array_push($errors, 'GroupID is ongeldig!');

        }

        //Email is niet verplicht maar als hij wordt ingevult moet deze wel correct zijn!
        if($email != null) {

            if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {

                array_push($errors, 'Emailadres is niet geldig!');

            }
        }

        if($password !== null) {

            //Nakijken of de wachtwoorden wel overeen komen!
            if($password !== $passwordRepeat) {

                array_push($errors, 'Wachtwoorden komen niet overeen!');

            }

            if (strlen($password) < 6) {

                array_push($errors, 'Wachtwoord moet langer dan 6 tekens zijn!');

            }
        }

        if (strlen($username) < 3) {

            array_push($errors, 'Gebruikersnaam moet langer dan 3 tekens zijn!');

        }

        if(!is_integer($forcedPasswordChange)){

            array_push($errors, 'Ongeldige optie om wachtwoord te veranderen!');

        }

        if(!is_integer($role)){

            array_push($errors, 'Ongeldige rol!');

        }

        //Gebruikersnaam al bezet?
        if(UserModel::usernameExists($username) && $userID == '0') {

            array_push($errors, ['Gebruikersnaam al in gebruik!']);

        }

        //Als er geen errors zijn kunnen we het account aanmaken of updaten
        if(count($errors) > 0 ) {

            $this->output(['error' => ['msg' => $errors]]);

        }else {

            //Check if the userID is 0 if it is then the user has no account
            if ($userID == '0') {

                $userAccountMapper = new VarMapper();

                $id = \Ramsey\Uuid\Uuid::uuid4();

                //Set alle the userinfo to map so the model can handel the information
                $userAccountMapper->setVarMap([

                    'id' => $id,
                    'username' => $username,
                    'password' => password_hash($password, PASSWORD_DEFAULT),
                    'email' => $email,
                    'firstname' => $firstname,
                    'lastname' => $lastname,
                    'extranames' => $extranames,
                    'initialen' => $initialen,
                    'telephone' => $telephone,
                    'street' => $street,
                    'housenr' => $housenr,
                    'postalcode' => $postalcode,
                    'city' => $city,
                    'dob' => $dob,
                    'birthplace' => $birthplace,
                    'birthcountry' => $birthcountry,
                    'role' => $role,
                    'forcedPasswordChange' => $forcedPasswordChange == null ? 1 : $forcedPasswordChange

                ]);

                UserModel::create($userAccountMapper);
                UserModel::setUserInGroup($id,$groupID);

                $this->output([

                    'success' => ['msg' => ['Gebruiker succesvol aangemaakt!']]

                ]);

            } else {

                UserModel::updateFieldByID($userID,'email', $email);
                UserModel::updateFieldByID($userID,'firstname', $firstname);
                UserModel::updateFieldByID($userID,'lastname', $lastname);
                UserModel::updateFieldByID($userID,'extranames', $extranames);
                UserModel::updateFieldByID($userID,'initialen', $initialen);
                UserModel::updateFieldByID($userID,'telephone', $telephone);
                UserModel::updateFieldByID($userID,'street', $street);
                UserModel::updateFieldByID($userID,'housenr', $housenr);
                UserModel::updateFieldByID($userID,'postalcode', $postalcode);
                UserModel::updateFieldByID($userID,'city', $city);
                UserModel::updateFieldByID($userID,'dob', $dob);
                UserModel::updateFieldByID($userID,'birthplace', $birthplace);
                UserModel::updateFieldByID($userID,'birthcountry', $birthcountry);
                UserModel::updateFieldByID($userID,'role', $role);
                UserModel::updateFieldByID($userID,'forcedPasswordChange', $forcedPasswordChange == null ? 1 : $forcedPasswordChange);

                //If the user password don't is null then we will change it!
                if($password !== null){

                    UserModel::updateFieldByID($userID,'password', password_hash($password, PASSWORD_DEFAULT));

                }

                $this->output([

                    'success' => ['msg' => 'Gebruiker succesvol bewerkt!']

                ]);

            }

        }

    }

}