<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Assessment extends Model
{
    use HasFactory, SoftDeletes;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'employee_id',
        'template_id',
        'evaluator_id',
        'assessment_date',
        'period',
        'total_score',
        'grade',
        'evaluator_notes',
        'development_plan',
        'recommendation',
        'status',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'assessment_date' => 'date',
        'assessment_period_start' => 'date',
        'assessment_period_end' => 'date',
        'total_score' => 'decimal:2',
    ];

    /**
     * Get the employee being assessed.
     */
    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    /**
     * Get the template used for this assessment.
     */
    public function template()
    {
        return $this->belongsTo(AssessmentTemplate::class, 'template_id');
    }

    /**
     * Get the evaluator who created this assessment.
     */
    public function evaluator()
    {
        return $this->belongsTo(User::class, 'evaluator_id');
    }

    /**
     * Get scores for this assessment.
     */
    public function scores()
    {
        return $this->hasMany(AssessmentScore::class);
    }

    /**
     * Calculate total score from all indicator scores.
     */
    public function calculateTotalScore(): float
    {
        return $this->scores->sum('weighted_value');
    }

    /**
     * Determine grade based on total score.
     */
    public function determineGrade(): string
    {
        $score = $this->total_score;

        if ($score >= 4.5)
            return 'Sangat Baik';
        if ($score >= 3.5)
            return 'Baik';
        if ($score >= 2.5)
            return 'Cukup';
        if ($score >= 1.5)
            return 'Kurang';
        return 'Sangat Kurang';
    }

    /**
     * Get recommendation based on grade.
     */
    public function getRecommendation(): string
    {
        $grade = $this->grade ?? $this->determineGrade();

        return match ($grade) {
            'Sangat Baik' => 'Pertahankan prestasi. Berikan reward dan pertimbangkan promosi.',
            'Baik' => 'Kinerja memuaskan. Berikan motivasi untuk meningkatkan ke Sangat Baik.',
            'Cukup' => 'Perlu perbaikan. Berikan coaching dan monitoring intensif.',
            'Kurang' => 'Kinerja tidak memenuhi standar. Berikan peringatan dan program perbaikan.',
            'Sangat Kurang' => 'Kinerja sangat buruk. Pertimbangkan tindakan disiplin.',
            default => 'Tidak ada rekomendasi.',
        };
    }

    /**
     * Scope for completed assessments.
     */
    public function scopeCompleted($query)
    {
        return $query->where('status', 'completed');
    }

    /**
     * Scope for draft assessments.
     */
    public function scopeDraft($query)
    {
        return $query->where('status', 'draft');
    }

    /**
     * Scope for assessments by date range.
     */
    public function scopeByDateRange($query, $start, $end)
    {
        return $query->whereBetween('assessment_date', [$start, $end]);
    }

    /**
     * Boot the model.
     */
    protected static function boot()
    {
        parent::boot();

        static::saving(function ($assessment) {
            if ($assessment->total_score) {
                $assessment->grade = $assessment->determineGrade();
                $assessment->recommendation = $assessment->getRecommendation();
            }
        });
    }
}
