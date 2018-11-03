<?php
/**
 * A project created by Jitsedev.be
 *
 * Author: Jitse Taels <jitse@jitsedev.be>
 * Date: 23/10/18 18:42
 */

namespace Schoolbase\Core\DB;


use PDO;

class DB
{

    private static $instance;
    private $connection;
    private $data;
    private $rowCount;
    private $query;
    private $fields;


    private function __construct()
    {

        $dbConf = include BASEPATH . '/../app/config/database.conf.php';

        try {

            $this->connection = new \PDO('mysql:host=' . $dbConf['mysql']['host'] . ';port=3306;dbname=' . $dbConf['mysql']['table'], $dbConf['mysql']['username'], $dbConf['mysql']['password']);

        }catch (\PDOException $exception) {

            die('Er is een probleem bij het verbinden van de database');

        }

    }

    public static function getInstance(){

        if(self::$instance == null)
            self::$instance = new DB();

        return self::$instance;

    }

    public function query($sql,$toEscape = []){

        $this->query = $this->connection->prepare($sql);
        $this->query->execute((array) $toEscape);

        $this->rowCount = $this->query->rowCount();
        $this->data = $this->query->fetchAll(\PDO::FETCH_CLASS);

        return $this;

    }

    public function getFirstResult(){

        if(isset($this->data[0]))
            return $this->data[0];

        return null;

    }

    public function getResults(){

        return $this->data;

    }

    public function getRowCount(){

        return (int) $this->rowCount;

    }

    public function insert($table,$data = []){

        $fieldString = null;
        $valueString = null;

        $rows = [];

        foreach ($data as $field => $value){

            $fieldString = $fieldString . ' ' . $field . ',';
            $valueString = $valueString . '?,';

            array_push($rows, $value);

        }

        $fieldString = rtrim($fieldString, ',');
        $valueString = rtrim($valueString, ',');

        $sql = "INSERT INTO {$table}({$fieldString}) VALUES({$valueString})";

        $this->query($sql, $rows);

    }

    public function select($fields) {



    }

}