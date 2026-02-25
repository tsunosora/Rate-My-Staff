<!DOCTYPE html>
<html>

<head>
    <title>Employee List</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            font-size: 12px;
        }

        table {
            width: 100%;
            border-collapse: collapse;
        }

        th,
        td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
        }

        th {
            background-color: #f2f2f2;
        }

        h2 {
            text-align: center;
            color: #333;
        }
    </style>
</head>

<body>
    <h2>Employee Directory Report</h2>
    <p>Generated on: <?php echo e(now()->format('Y-m-d H:i:s')); ?></p>
    <table>
        <thead>
            <tr>
                <th>Emp ID</th>
                <th>Full Name</th>
                <th>Department</th>
                <th>Position</th>
                <th>Join Date</th>
                <th>Status</th>
            </tr>
        </thead>
        <tbody>
            <?php $__currentLoopData = $employees; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $emp): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
                <tr>
                    <td><?php echo e($emp->employee_code); ?></td>
                    <td><?php echo e($emp->full_name); ?></td>
                    <td><?php echo e($emp->department); ?></td>
                    <td><?php echo e($emp->position); ?></td>
                    <td><?php echo e($emp->join_date ? $emp->join_date->format('Y-m-d') : '-'); ?></td>
                    <td><?php echo e($emp->is_active ? 'Active' : 'Inactive'); ?></td>
                </tr>
            <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
        </tbody>
    </table>
</body>

</html><?php /**PATH D:\FAISAL\appdev\rate my staff\resources\views/exports/employees.blade.php ENDPATH**/ ?>