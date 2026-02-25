<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\Department; // Assuming Department model is in the same namespace
use App\Models\Employee; // Assuming Employee model is in the same namespace

class Position extends Model
{
    protected $fillable = ['department_id', 'name'];

    public function department()
    {
        return $this->belongsTo(Department::class);
    }

    public function employees()
    {
        return $this->hasMany(Employee::class);
    }
}
