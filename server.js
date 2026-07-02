const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/simulate', (req, res) => {
    const userCode = req.body.code;
    const fileId = Date.now();
    
    const vFilePath = path.join(__dirname, `design_${fileId}.v`);
    const outFilePath = path.join(__dirname, `design_${fileId}.out`);

    // Write file to local disk sandbox
    fs.writeFileSync(vFilePath, userCode);

    // Call the real installed iverilog compiler toolchain binary
    exec(`iverilog -o ${outFilePath} ${vFilePath}`, (compileErr, stdout, stderr) => {
        if (compileErr || stderr) {
            if (fs.existsSync(vFilePath)) fs.unlinkSync(vFilePath);
            return res.json({ result: `❌ Compilation Error:\n${stderr || compileErr.message}` });
        }

        // Run the generated compiled circuit executable
        exec(`./${outFilePath}`, (runErr, runStdout, runStderr) => {
            // Self-cleaning cycle
            if (fs.existsSync(vFilePath)) fs.unlinkSync(vFilePath);
            if (fs.existsSync(outFilePath)) fs.unlinkSync(outFilePath);

            if (runErr) {
                return res.json({ result: `❌ Runtime Execution Fault:\n${runStderr || runErr.message}` });
            }

            res.json({ result: `✅ Simulation Successful:\n\n${runStdout}` });
        });
    });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log('EDA Engine online.'));