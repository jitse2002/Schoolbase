<?php
/**
 * A project created by Jitsedev.be
 *
 * Author: Jitse Taels <jitse@jitsedev.be>
 * Date: 31/10/18 15:23
 */

$router = new Bramus\Router\Router();

$router->get('/', function(){

    \Schoolbase\Core\Util\Resource::callModuleController('Home','Homepage','index');

});

$router->get('/logout', function(){

    unset($_SESSION['user']);

    header('location: /');

    die;

});

$router->get('/usermanagement', function(){

    \Schoolbase\Core\Util\Resource::callModuleController('Default','Usermanagement','index');

});

$router->get('/usermanagement/user/create/groupID:(\d+)/userID:([a-z0-9_-]+)', function($groupID,$userID){

    \Schoolbase\Core\Util\Resource::callModuleController('Default','Usermanagement','user',['groupID' => $groupID,'userID' => $userID]);

});

$router->get('/usermanagement/rest/v1/groups/buildtree', function(){

    \Schoolbase\Core\Util\Resource::callModuleController('Rest','Usermanagement','group_tree');

});

//Route for create or edit a user
$router->post('/usermanagement/rest/v1/users/create', function(){

    \Schoolbase\Core\Util\Resource::callModuleController('Rest','Usermanagement','edituser');

});

$router->get('/skore', function(){

    \Schoolbase\Core\Util\Resource::callModuleController('Skorehome','Skore','index');

});


$router->run();