<?php
/**
 * A project created by Jitsedev.be
 *
 * Author: Jitse Taels <jitse@jitsedev.be>
 * Date: 25/10/18 18:21
 */

namespace Schoolbase\Core\Util;


class Resource
{

    public static function callController($name,$function){

        $path = BASEPATH . "/../app/controllers/{$name}Controller.php";

        if(file_exists($path)){

            include $path;

            $classname = $name . 'Controller';

            if(class_exists($classname)) {

                $class = new $classname();

                if(method_exists($class,$function))
                    return $class->$function();
                else
                    die("Unable to load the classname {$classname} for the controller {$name}");

            }else
                die("Unable to load the classname {$classname} for the controller {$name}");

        }else
            die("Unable to load the controller: {$name}");

    }

    public static function callView($name,$var = []){

        $path = BASEPATH . "/../app/views/{$name}.php";

        include_once BASEPATH . "/../app/views/header.php";

        if(file_exists($path)){

            include $path;

        }else
            die("Unable to load the view: {$name}");

        include_once BASEPATH . "/../app/views/footer.php";

    }

    public static function callModuleController($name,$module,$function,$parameters = []){

        $path = BASEPATH . "/../app/modules/{$module}/controllers/{$name}Controller.php";

        if(file_exists($path)){

            include $path;

            $classname = $name . 'Controller';

            if(class_exists($classname)) {

                $class = new $classname();

                $class->parameter_array($parameters);

                if(method_exists($class,$function))
                    return $class->$function();
                else
                    die("Unable to load the classname {$classname} for the controller {$name}");

            }else
                die("Unable to load the classname {$classname} for the controller {$name}");

        }else
            die("Unable to load the controller: {$name}");

    }

    public static function callModuleView($module,$name, $var =[]){

        $path = BASEPATH . "/../app/modules/{$module}/views/{$name}.php";

        include_once BASEPATH . "/../app/views/authheader.php";

        if(file_exists($path)){

            include $path;

        }else
            die("Unable to load the view: {$path}");

        include_once BASEPATH . "/../app/views/footer.php";

    }

}