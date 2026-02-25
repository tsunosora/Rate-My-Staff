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
    <p>Generated on: {{ now()->format('Y-m-d H:i:s') }}</p>
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
            @foreach($employees as $emp)
                <tr>
                    <td>{{ $emp->employee_code }}</td>
                    <td>{{ $emp->full_name }}</td>
                    <td>{{ $emp->department }}</td>
                    <td>{{ $emp->position }}</td>
                    <td>{{ $emp->join_date ? $emp->join_date->format('Y-m-d') : '-' }}</td>
                    <td>{{ $emp->is_active ? 'Active' : 'Inactive' }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>
</body>

</html>